
import fs from "fs"
import { PDFParse } from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MistralAIEmbeddings } from "@langchain/mistralai"
import "dotenv/config"


const readFile = async (filePath) => {

    const dataBuffer = fs.readFileSync(filePath)
    const parser = new PDFParse({
        data: dataBuffer
    })
    return await parser.getText()

}
const result = await readFile("./js.pdf")

const embedding = new MistralAIEmbeddings({
    apiKey: process.env.MISTRAL_API
})

const splitter = new RecursiveCharacterTextSplitter(
    {
        chunkSize: 1000,
        chunkOverlap: 150
    }
)

const chunks = await splitter.splitText(result.text)

console.log("length of each chunks : ", chunks.length)


