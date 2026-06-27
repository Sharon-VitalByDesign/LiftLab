import { NextResponse } from "next/server";
import { inflateRawSync } from "zlib";

export const runtime = "nodejs";

const schemas = {
  tools: ["tools"],
  implementation: ["suggestions"],
  fading: ["fadingStrategies"]
};

const extractLessonPrompt = `You are a helpful assistant for teachers. A teacher has uploaded a lesson plan document. Extract the key information and write a concise 2-3 sentence lesson description suitable for use in a support planning tool. Include the subject, grade level if mentioned, the main learning activity, and the primary student task or output. Do not include assessment details, standards codes, or teacher prep steps. Return plain text only, no JSON, no markdown.`;

function buildPrompt(callType, payload) {
  const { lessonDescription, gradeLevel, selectedDomainsAndSubdomains, selectedStrategies } = payload;

  if (callType === "tools") {
    return `You are an educational technology expert who specializes in age-appropriate, safety-conscious tool recommendations for K-12 and higher education teachers.

A teacher is planning the following lesson: ${lessonDescription} for ${gradeLevel} students.

They have identified the following areas of learner variability they want to support:
${selectedDomainsAndSubdomains}

Suggest AI-powered tools that could help support these specific areas of variability.

IMPORTANT REQUIREMENTS:
- Only suggest tools appropriate for the age/grade level indicated
- Prioritize tools with strong child safety records, COPPA compliance where relevant, and clear privacy policies
- Do NOT suggest tools with known data privacy concerns for student use
- For each tool, provide: tool name, one sentence description, which variability area it supports, and a brief note on why it is appropriate for this age group
- Format your response as JSON only, no preamble, no markdown. Schema:
{
  "tools": [
    {
      "name": "Tool Name",
      "description": "One sentence description",
      "supports": "Domain/subdomain it addresses",
      "ageNote": "Why appropriate for this grade level",
      "teacherFacing": true,
      "studentFacing": false
    }
  ]
}
- Suggest between 5-10 tools maximum
- These are suggestions for the teacher to research, not endorsements
- Draw from established, reputable tools. You may reference tools including but not limited to: Diffit, Eduaide, Brisk Teaching, SchoolAI, MagicSchool AI, Curipod, Wakelet, Canva AI features, NotebookLM, Immersive Reader, Read&Write, Quizlet, Formative, Nearpod, Pear Deck, Desmos, GeoGebra, Book Creator, Parlay, Kami, Mote, TeachFX, Grammarly EDU, and others you know to be reputable and safe.`;
  }

  if (callType === "implementation") {
    return `You are an expert instructional designer specializing in inclusive education and learner variability.

A teacher is planning the following lesson: ${lessonDescription} for ${gradeLevel} students.

They have identified these areas of variability to support:
${selectedDomainsAndSubdomains}

They have selected these specific strategies to implement:
${selectedStrategies}

Generate 3 distinct, concrete implementation suggestions for how this teacher could incorporate these supports into their specific lesson. Each suggestion should:
- Be practical and immediately actionable
- Be specific to THIS lesson, not generic advice
- Show how multiple selected strategies could work together
- Respect that the teacher, not AI, is the instructional decision-maker
- Preserve student cognitive lift

Format as JSON only, no preamble, no markdown. Schema:
{
  "suggestions": [
    {
      "title": "Short descriptive title for this approach",
      "description": "2-3 sentence concrete description of how to implement this in the lesson",
      "strategiesUsed": ["strategy1", "strategy2"]
    }
  ]
}`;
  }

  return `You are an expert in scaffolded instruction and gradual release of responsibility.

A teacher is planning: ${lessonDescription} for ${gradeLevel} students.

They have selected these supports:
${selectedStrategies}

For each support or group of supports, suggest one concrete way the teacher could gradually fade that support toward student independence over time. Focus on:
- Observable indicators that a student is ready for less support
- A specific next step that reduces the support while preserving the learning
- How to know when independence has been achieved

Format as JSON only, no preamble, no markdown. Schema:
{
  "fadingStrategies": [
    {
      "support": "Name of support or group",
      "indicator": "What to look for that signals readiness to fade",
      "nextStep": "Concrete action to reduce the support",
      "independenceMarker": "What independence looks like for this support"
    }
  ]
}`;
}

function parseJson(text) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

function validate(callType, data) {
  const required = schemas[callType];
  return required?.every((key) => Array.isArray(data?.[key]));
}

function readZipEntries(buffer) {
  const entries = {};
  const endSignature = 0x06054b50;
  let endOffset = -1;

  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === endSignature) {
      endOffset = index;
      break;
    }
  }

  if (endOffset < 0) return entries;

  const centralDirectorySize = buffer.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);
  let offset = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (offset < end && buffer.readUInt32LE(offset) === 0x02014b50) {
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    if (fileName.startsWith("word/") && fileName.endsWith(".xml")) {
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      const data = compression === 8 ? inflateRawSync(compressed) : compressed;
      entries[fileName] = data.toString("utf8");
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function xmlToText(xml) {
  return xml
    .replace(/<w:tab\/>/g, " ")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractDocxText(buffer) {
  const entries = readZipEntries(buffer);
  const xml = [entries["word/document.xml"], entries["word/header1.xml"], entries["word/footer1.xml"]].filter(Boolean).join("\n");
  return xmlToText(xml).slice(0, 18000);
}

async function callAnthropic(apiKey, body) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error("AI request failed");
  }

  return response.json();
}

async function extractLessonFromUpload(request, apiKey) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const lowerName = file.name.toLowerCase();
  const content = [{ type: "text", text: extractLessonPrompt }];

  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    content.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: buffer.toString("base64")
      }
    });
  } else if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    const extractedText = extractDocxText(buffer);
    if (!extractedText) {
      return NextResponse.json({ error: "Could not read document" }, { status: 422 });
    }
    content.push({ type: "text", text: `Lesson plan text:\n${extractedText}` });
  } else {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const result = await callAnthropic(apiKey, {
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    temperature: 0.2,
    messages: [{ role: "user", content }]
  });

  const description = result?.content?.find((part) => part.type === "text")?.text?.trim();

  if (!description) {
    return NextResponse.json({ error: "Malformed AI response" }, { status: 502 });
  }

  return NextResponse.json({ description });
}

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      return extractLessonFromUpload(request, apiKey);
    }

    const body = await request.json();
    const { callType } = body;

    if (!schemas[callType]) {
      return NextResponse.json({ error: "Invalid call type" }, { status: 400 });
    }

    const result = await callAnthropic(apiKey, {
      model: "claude-sonnet-4-6",
      max_tokens: 1800,
      temperature: 0.35,
      messages: [{ role: "user", content: buildPrompt(callType, body) }]
    });

    const text = result?.content?.find((part) => part.type === "text")?.text || "";
    const parsed = parseJson(text);

    if (!validate(callType, parsed)) {
      return NextResponse.json({ error: "Malformed AI response" }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
