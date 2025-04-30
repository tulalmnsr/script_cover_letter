#!/usr/bin/env node
// generateCoverLetter.js

require("dotenv").config();
const fs = require("fs");
const pdfParse = require("pdf-parse");
const axios = require("axios");
const csvParser = require("csv-parser");
const { Command } = require("commander");
const { OpenAI } = require("openai");

const program = new Command();
program
  .requiredOption(
    "-p, --pdfs <files...>",
    "Paths to at least 3 past cover-letter PDF files"
  )
  .requiredOption(
    "-c, --csv <file>",
    "Path to CSV file containing job description URLs"
  )
  .option("-o, --output <file>", "Output file", "output.txt")
  .parse();

const { pdfs, csv: csvPath, output } = program.opts();

// Validate PDF count
if (pdfs.length < 3) {
  console.error("Error: Please provide at least 3 PDF files for past cover letters.");
  process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY not set in .env");
  process.exit(1);
}

// Step 1: Extract text from PDFs
async function extractPdfText(files) {
  let combined = "";
  for (let file of files) {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }
    const data = fs.readFileSync(file);
    try {
      const parsed = await pdfParse(data);
      combined += parsed.text.trim() + "\n\n";
    } catch (err) {
      console.warn(`Warning: Failed to parse PDF ${file}, skipping. (${err.message})`);
    }
  }
  return combined.trim() || "[No valid cover-letter text found.]";
}

// Step 2: Fetch job descriptions from CSV URLs
async function fetchJobDescriptions(csvFile) {
  if (!fs.existsSync(csvFile)) {
    console.error(`Error: CSV file not found: ${csvFile}`);
    process.exit(1);
  }
  const urls = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFile)
      .pipe(csvParser())
      .on("data", (row) => {
        const url = row.url || row.URL || Object.values(row)[0];
        if (url) urls.push(url);
      })
      .on("end", async () => {
        let descriptions = "";
        for (let url of urls) {
          try {
            const res = await axios.get(url);
            descriptions += res.data.trim() + "\n\n";
          } catch (err) {
            console.warn(`Warning: Could not fetch ${url}: ${err.message}`);
            descriptions += `[Could not fetch ${url}]\n\n`;
          }
        }
        resolve(descriptions.trim());
      })
      .on("error", (err) => reject(err));
  });
}

// Step 3: Build prompt and call OpenAI
async function generateContent(pastLetters, jobText) {
  const prompt = `
You are an AI job application assistant.

Below are past cover letters (to learn the applicant's style):
${pastLetters}

Below is the job description (fetched from provided URLs):
${jobText}

Please generate the following:

=== Tailored Cover Letter ===
(A few paragraphs addressing the job and company, incorporating the applicant's style and the job requirements.)

=== CV Improvement Suggestions ===
- (List actionable changes or additions to the applicant's resume for this role.)

=== Personalized Application Tips ===
1. (List specific next steps or advice tailored to this job application.)
`;
  const resp = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  return resp.choices[0].message.content.trim();
}

// Main
(async () => {
  console.log("Extracting text from PDFs...");
  const pastLetters = await extractPdfText(pdfs);

  console.log("Fetching job descriptions from CSV...");
  const jobText = await fetchJobDescriptions(csvPath);

  console.log("Generating cover letter and advice (this may take a moment)...");
  try {
    const outputText = await generateContent(pastLetters, jobText);
    fs.writeFileSync(output, outputText);
    console.log(`
✔️  Done! Results saved to ${output}
`);
  } catch (err) {
    console.error("Error during OpenAI generation:", err);
    process.exit(1);
  }
})();
