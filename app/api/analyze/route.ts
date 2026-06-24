import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export interface AnalysisResult {
  summary: string;
  sentimentOverall: "positive" | "negative" | "neutral" | "mixed";
  sentimentScore: number; // -100 ~ 100
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  keyTopics: { topic: string; count: number; sentiment: string }[];
  highlights: { text: string; reason: string }[];
  concerns: { text: string; reason: string }[];
  viewerProfile: string;
  recommendations: string[];
  keywords: string[];
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let body: { comments: string[]; videoTitle: string; channelTitle: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 데이터가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { comments, videoTitle, channelTitle } = body;
  if (!comments || comments.length === 0) {
    return NextResponse.json(
      { error: "분석할 댓글이 없습니다." },
      { status: 400 }
    );
  }

  // 댓글이 너무 많으면 샘플링 (토큰 절약)
  const sampleSize = Math.min(comments.length, 150);
  const sampledComments =
    comments.length > sampleSize
      ? comments
          .sort(() => Math.random() - 0.5)
          .slice(0, sampleSize)
      : comments;

  const commentText = sampledComments
    .map((c, i) => `[${i + 1}] ${c}`)
    .join("\n");

  const prompt = `당신은 유튜브 댓글 분석 전문가입니다. 아래 유튜브 동영상의 댓글들을 심층 분석해 주세요.

동영상 제목: ${videoTitle}
채널명: ${channelTitle}
댓글 수 (분석 대상): ${sampledComments.length}개

=== 댓글 목록 ===
${commentText}

=== 분석 요청 ===
다음 JSON 형식으로 정확하게 응답해 주세요. JSON 외에 다른 텍스트를 포함하지 마세요:

{
  "summary": "전체 댓글 분위기와 주요 내용을 3-4문장으로 요약",
  "sentimentOverall": "positive | negative | neutral | mixed 중 하나",
  "sentimentScore": -100에서 100 사이의 정수 (매우부정=-100, 중립=0, 매우긍정=100),
  "sentimentBreakdown": {
    "positive": 긍정 댓글 비율(0-100 정수),
    "neutral": 중립 댓글 비율(0-100 정수),
    "negative": 부정 댓글 비율(0-100 정수)
  },
  "keyTopics": [
    {"topic": "주요 화제", "count": 언급횟수, "sentiment": "positive|neutral|negative"}
  ],
  "highlights": [
    {"text": "대표적인 긍정 댓글 원문(간략히)", "reason": "선정 이유"}
  ],
  "concerns": [
    {"text": "우려/비판 댓글 원문(간략히)", "reason": "주요 우려사항"}
  ],
  "viewerProfile": "시청자 특성 및 관심사 분석 2-3문장",
  "recommendations": ["콘텐츠 개선 제안 1", "콘텐츠 개선 제안 2", "콘텐츠 개선 제안 3"],
  "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3", "핵심키워드4", "핵심키워드5"]
}

keyTopics는 최대 8개, highlights는 최대 3개, concerns는 최대 3개, recommendations는 3-5개, keywords는 5-10개로 제한해 주세요.`;

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content || "{}";
    const result: AnalysisResult = JSON.parse(raw);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
