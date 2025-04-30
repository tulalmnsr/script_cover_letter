# AI Cover Letter Generator Script

This script automates the creation of a job-specific cover letter, CV improvement suggestions, and personalized application tips using OpenAI.

## Requirements

- Node.js installed
- An OpenAI API key
- At least 3 PDF files of past cover letters
- A CSV file (`jobs.csv`) with a header `url` and one URL per line

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your OpenAI API key:
   ```
   cp .env.example .env
   ```

## Usage

```bash
node generateCoverLetter.js \
  --pdfs ./cover_letters/letter1.pdf ./cover_letters/letter2.pdf ./cover_letters/letter3.pdf \
  --csv ./jobs.csv \
  --output output.txt
```

- `--pdfs` — paths to your past cover-letter PDF files (minimum 3)
- `--csv` — path to your CSV file with job URLs
- `--output` — (optional) path for the result file (default: `output.txt`)

The script will generate and save the result to the specified output file.
