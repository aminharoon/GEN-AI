# 📄 PDF RAG Pipeline — Mistral + Pinecone

A lightweight **Retrieval-Augmented Generation (RAG)** pipeline that reads a PDF file, splits it into chunks, generates vector embeddings using **Mistral AI**, stores them in **Pinecone**, and lets you query your document using natural language.

---

## 🧠 What This Project Does

> You give it a PDF → It reads, chunks, embeds, and stores it → Then you can ask questions about it using natural language.

This is the **ingestion + retrieval layer** of a RAG system — the backbone of any AI document assistant.

---

## 🗂️ Project Structure

```
project/
│
├── index.js          # Main pipeline (this file)
├── .env              # API keys (never commit this!)
├── package.json
└── your-file.pdf     # The PDF you want to query
```

---

## ⚙️ Tech Stack

| Tool                          | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| `pdf-parse`                   | Extract raw text from a PDF file         |
| `@langchain/textsplitters`    | Split large text into smaller chunks     |
| `@langchain/mistralai`        | Generate vector embeddings using Mistral |
| `@pinecone-database/pinecone` | Store and query vectors in Pinecone DB   |
| `dotenv`                      | Load API keys from `.env` file           |

---

## 🚀 Getting Started

### 1. Clone the Project

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 2. Install Dependencies

```bash
npm install pdf-parse @langchain/textsplitters @langchain/mistralai @pinecone-database/pinecone dotenv
```

### 3. Set Up Environment Variables

Create a `.env` file in the root:

```env
MISTRAL_API=your_mistral_api_key_here
PINECONE_API=your_pinecone_api_key_here
```

- 🔑 Get your **Mistral API key** → [console.mistral.ai](https://console.mistral.ai)
- 🔑 Get your **Pinecone API key** → [app.pinecone.io](https://app.pinecone.io)

### 4. Create a Pinecone Index

Go to your Pinecone dashboard and create an index named `testrag` with:

- **Dimensions**: `1024` (Mistral `mistral-embed` output size)
- **Metric**: `cosine`

---

## 🔍 How Each Step Works

### Step 1 — Read the PDF (`readFile`)

```js
const readFile = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  return await parser.getText();
};
```

- Reads the PDF from disk as a **binary buffer** using Node's `fs` module.
- Passes the buffer into `PDFParse`, which extracts all the **plain text** from every page.
- Returns an object containing the raw text.

> **Usage:** `const result = await readFile("./your-file.pdf")`

---

### Step 2 — Split Text into Chunks (`getChunk`)

```js
const getChunk = async (data) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 10,
  });
  const chunks = await splitter.splitText(data.text);
  return chunks;
};
```

- Raw PDF text can be **thousands of characters** — too large to embed at once.
- `RecursiveCharacterTextSplitter` breaks the text into chunks of **500 characters**.
- `chunkOverlap: 10` means consecutive chunks share 10 characters — this preserves **context at the boundaries** so no sentence is cut off abruptly.
- Returns an array of smaller text strings.

> **Why chunking?** Embedding models have token limits. Smaller chunks also improve retrieval precision.

---

### Step 3 — Generate Embeddings (`getEmbedding`)

```js
const getEmbedding = async (chunks) => {
  return Promise.all(
    chunks.map(async (chunk) => {
      const embeddings = await embedding.embedQuery(chunk);
      return { text: chunk, embeddings };
    }),
  );
};
```

- For every chunk, it calls **Mistral's `mistral-embed` model** via `embedQuery`.
- The model converts each text chunk into a **vector** (array of 1024 numbers) that represents its meaning.
- `Promise.all` runs all embeddings **in parallel** for speed.
- Returns an array of objects: `{ text, embeddings }`.

> **Think of embeddings as:** A GPS coordinate for meaning. Similar sentences are close together in vector space.

---

### Step 4 — Upload to Pinecone (`upLoadVector`)

```js
const upLoadVector = async (embeddedDoc) => {
  const response = await index.upsert({
    records: embeddedDoc.map((doc, i) => ({
      id: `DOC-${i}`,
      values: doc.embeddings,
      metadata: { text: doc.text },
    })),
  });
};
```

- Takes all embedded chunks and **upserts** them into the Pinecone index.
- Each record has:
  - `id` — a unique identifier (`DOC-0`, `DOC-1`, etc.)
  - `values` — the vector (1024 numbers)
  - `metadata.text` — the original text (so we can retrieve it later)
- `upsert` means: **insert if new, update if ID already exists**.

---

### Step 5 — Query the Vector Database (`getFromVector`)

```js
const getFromVector = async (query) => {
  const queryEmbed = await embedding.embedQuery(query);
  const result = await index.query({
    vector: queryEmbed,
    topK: 1,
    includeMetadata: true,
  });
  return result;
};
```

- Converts your **natural language question** into a vector using the same Mistral model.
- Sends that vector to Pinecone, which finds the **most similar stored vectors** using cosine similarity.
- `topK: 1` returns the single most relevant chunk.
- `includeMetadata: true` returns the original text along with the match.

> **Example:** `await getFromVector("what is the house no of Haroon")`
> Pinecone finds the chunk that most closely matches this question and returns the text.

---

## 🧪 Running the Pipeline

To **ingest** a PDF (uncomment the lines in `index.js`):

```js
const result = await readFile("./your-file.pdf");
const chunks = await getChunk(result);
const embeddedDoc = await getEmbedding(chunks);
await upLoadVector(embeddedDoc);
```

To **query** your document (already active at the bottom):

```js
const response = await getFromVector("your question here");
console.log(JSON.stringify(response));
```

Then run:

```bash
node index.js
```

---

## 📌 Important Notes

- **Only ingest once.** Comment out the ingestion steps after the first run — otherwise you'll create duplicate vectors in Pinecone.
- The `PDFParse` import should be the **default import**: `import PDFParse from 'pdf-parse'` (not named import).
- Make sure your Pinecone index dimension matches Mistral's output (`1024`).

---

> Built with ❤️ using LangChain, Mistral AI, and Pinecone.
