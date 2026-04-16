
import fs from "fs"
import { PDFParse } from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MistralAIEmbeddings } from "@langchain/mistralai"
import "dotenv/config"
import { Embeddings } from "@langchain/core/embeddings";
import { Pinecone } from '@pinecone-database/pinecone'



/**
 * This code reads a PDF file, extracts its text, splits the text into chunks, generates embeddings for each chunk using MistralAIEmbeddings, and uploads the embeddings to a Pinecone vector database. It also includes a function to query the vector database using a text query and retrieve relevant results based on the generated embeddings.
 * 
 * The main steps are:
 */
const embedding = new MistralAIEmbeddings({
    model: "mistral-embed",
    apiKey: process.env.MISTRAL_API
})


const pc = new Pinecone({
    apiKey: process.env.PINECONE_API
})
const index = pc.Index("testrag")

/**
 * 1. Read a PDF file and extract its text using the `readFile` function.
 */
const readFile = async (filePath) => {

    const dataBuffer = fs.readFileSync(filePath)
    const parser = new PDFParse({
        data: dataBuffer
    })
    return await parser.getText()

}

// const result = await readFile("./HaroonAdhar.pdf")


/**
 * 2. Split the extracted text into smaller chunks using the `getChunk` function, which utilizes the `RecursiveCharacterTextSplitter` from the `@langchain/textsplitters` library.
 */
const getChunk = async (data) => {

    const splitter = new RecursiveCharacterTextSplitter(
        {
            chunkSize: 500,
            chunkOverlap: 10
        }
    )
    const chunks = await splitter.splitText(data.text)
    return chunks

}

// const chunks = await getChunk(result)

/**
 * 3. Generate embeddings for each text chunk using the `getEmbedding` function, which calls the `embedQuery` method of the `MistralAIEmbeddings` class.
 */
const getEmbedding = async (chunks) => {
    return Promise.all(
        chunks.map(async (chunk) => {
            const embeddings = await embedding.embedQuery(chunk)
            return {
                text: chunk,
                embeddings
            }
        })
    )
}
// const embeddedDoc = await getEmbedding(chunks)

/**
 * 4. Upload the generated embeddings to a Pinecone vector database using the `upLoadVector` function, which calls the `upsert` method of the Pinecone index.
 */
const upLoadVector = async (embeddedDoc) => {
    try {
        const response = await index.upsert({
            records: embeddedDoc.map((doc, i) => ({
                id: `DOC-${i}`,
                values: doc.embeddings,
                metadata: {
                    text: doc.text
                }
            }))

        })
        console.log(response)
    } catch (e) {
        console.log(`something went wrong ${e.message}`)

    } finally {
        console.log("record are successfully uploaded to vector data base ")
    }
}



/**
 * 5. Query the Pinecone vector database using the `getFromVector` function, which takes a text query, generates its embedding, and retrieves relevant results based on the similarity of the embeddings stored in the database.
 */
const getFromVector = async (query) => {
    const queryEmbed = await embedding.embedQuery(query)
    const result = await index.query({
        vector: queryEmbed,
        topK: 1,
        includeMetadata: true


    })
    return result

}

const response = await getFromVector("what is the house no of Haroon")
console.log(JSON.stringify(response))


