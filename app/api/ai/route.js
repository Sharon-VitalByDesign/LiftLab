import { NextResponse } from "next/server";

export const runtime = "nodejs";

const schemas = {
  tools: ["tools"],
  implementation: ["suggestions"],
  fading: ["fadingStrategies"]
};

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

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const body = await request.json();
    const { callType } = body;

    if (!schemas[callType]) {
      return NextResponse.json({ error: "Invalid call type" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1800,
        temperature: 0.35,
        messages: [{ role: "user", content: buildPrompt(callType, body) }]
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }

    const result = await response.json();
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
