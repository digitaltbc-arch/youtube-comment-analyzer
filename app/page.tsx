"use client";

import { useState } from "react";
import type { YoutubeComment } from "./api/comments/route";
import type { AnalysisResult } from "./api/analyze/route";

interface VideoData {
  videoId: string;
  videoTitle: string;
  channelTitle: string;
  thumbnailUrl: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  comments: YoutubeComment[];
}

type Tab = "dashboard" | "insights" | "comments";

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "긍정적",
  negative: "부정적",
  neutral: "중립적",
  mixed: "복합적",
};

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "#4ade80",
  negative: "#f87171",
  neutral: "#94a3b8",
  mixed: "#fbbf24",
};

function formatNum(n: string | number): string {
  const x = Number(n);
  if (x >= 1_000_000) return (x / 1_000_000).toFixed(1) + "M";
  if (x >= 1_000) return (x / 1_000).toFixed(1) + "K";
  return String(x);
}

/* ─── 스피너 ───────────────────────────────────────────── */
function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
      <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-70" />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  );
}

/* ─── 감성 바 ──────────────────────────────────────────── */
function SentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  return (
    <div className="w-full h-3 rounded-full overflow-hidden flex">
      <div style={{ width: `${positive}%`, background: "#4ade80" }} />
      <div style={{ width: `${neutral}%`, background: "#475569" }} />
      <div style={{ width: `${negative}%`, background: "#f87171" }} />
    </div>
  );
}

/* ─── 수평 막대 차트 ────────────────────────────────────── */
function HBarChart({
  items,
  colorFn,
}: {
  items: { label: string; value: number; tag?: string; tagColor?: string }[];
  colorFn?: (i: number) => string;
}) {
  const max = Math.max(...items.map((d) => d.value));
  const colors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#818cf8", "#7c3aed", "#4f46e5"];

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              {item.tag && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: item.tagColor || "#94a3b8" }}
                />
              )}
              <span className="truncate max-w-[180px]">{item.label}</span>
            </div>
            <span className="text-slate-500 ml-2 shrink-0">{item.value}</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: colorFn ? colorFn(i) : colors[i % colors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── 키워드 워드클라우드 (버블 스타일) ─────────────────── */
function KeywordCloud({ keywords }: { keywords: string[] }) {
  const sizes = [
    "text-2xl font-bold",
    "text-xl font-semibold",
    "text-lg font-semibold",
    "text-base font-medium",
    "text-sm font-medium",
    "text-xs font-medium",
  ];
  const opacities = ["opacity-100", "opacity-90", "opacity-80", "opacity-70", "opacity-60", "opacity-50"];

  return (
    <div className="flex flex-wrap gap-2 justify-center py-2">
      {keywords.map((kw, i) => (
        <span
          key={kw}
          className={`${sizes[Math.min(i, sizes.length - 1)]} ${opacities[Math.min(i, opacities.length - 1)]} text-indigo-300 px-2 py-1 rounded-lg hover:opacity-100 transition-opacity cursor-default`}
        >
          {kw}
        </span>
      ))}
    </div>
  );
}

/* ─── 도넛 차트 (SVG) ──────────────────────────────────── */
function DonutChart({
  positive,
  neutral,
  negative,
  score,
}: {
  positive: number;
  neutral: number;
  negative: number;
  score: number;
}) {
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  const gap = 2;

  const slices = [
    { pct: positive, color: "#4ade80" },
    { pct: neutral, color: "#475569" },
    { pct: negative, color: "#f87171" },
  ];

  let offset = -90; // 12시 방향 시작
  const paths = slices.map(({ pct, color }) => {
    const deg = (pct / 100) * 360;
    const start = offset;
    offset += deg;
    if (pct === 0) return null;

    const startRad = ((start + gap / 2) * Math.PI) / 180;
    const endRad = ((start + deg - gap / 2) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = deg > 180 ? 1 : 0;

    return (
      <path
        key={color}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="18"
        strokeLinecap="round"
      />
    );
  });

  const scoreColor = score >= 30 ? "#4ade80" : score <= -30 ? "#f87171" : "#fbbf24";

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" />
      {paths}
      <text x={cx} y={cy - 8} textAnchor="middle" fill={scoreColor} fontSize="22" fontWeight="bold">
        {score > 0 ? "+" : ""}{score}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="10">
        감성 점수
      </text>
    </svg>
  );
}

/* ─── KPI 카드 ─────────────────────────────────────────── */
function KpiCard({
  value,
  label,
  sub,
  valueColor,
}: {
  value: string;
  label: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-xl p-4">
      <div className="text-2xl font-bold mb-0.5" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </div>
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  );
}

/* ─── 메인 ─────────────────────────────────────────────── */
export default function Home() {
  const [input, setInput] = useState("");
  const [maxResults, setMaxResults] = useState(100);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError("");
    setVideoData(null);
    setAnalysis(null);

    try {
      const res = await fetch(
        `/api/comments?videoId=${encodeURIComponent(input.trim())}&maxResults=${maxResults}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "댓글 수집 실패");
      setVideoData(data);
      setLoading(false);

      setAnalyzing(true);
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comments: data.comments.map((c: YoutubeComment) => c.text),
          videoTitle: data.videoTitle,
          channelTitle: data.channelTitle,
        }),
      });
      const analysisData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analysisData.error || "AI 분석 실패");
      setAnalysis(analysisData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setLoading(false);
    } finally {
      setAnalyzing(false);
    }
  }

  const engagementRate = videoData
    ? ((Number(videoData.likeCount) / Number(videoData.viewCount)) * 100).toFixed(2)
    : "—";

  const commentRate = videoData
    ? ((Number(videoData.commentCount) / Number(videoData.viewCount)) * 100).toFixed(3)
    : "—";

  const sentimentColor = analysis
    ? analysis.sentimentScore >= 30
      ? "#4ade80"
      : analysis.sentimentScore <= -30
        ? "#f87171"
        : "#fbbf24"
    : "#94a3b8";

  return (
    <div className="min-h-screen bg-[#0a0a10] text-white">
      {/* 헤더 */}
      <header className="border-b border-white/8 bg-[#0a0a10]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
              </svg>
            </div>
            <span className="font-semibold text-sm">유튜브 댓글 분석기</span>
          </div>
          {videoData && (
            <span className="text-xs text-slate-500 truncate max-w-xs">
              {videoData.channelTitle} · {videoData.comments.length}개 분석
            </span>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8">
        {/* 검색 폼 */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="YouTube URL 또는 영상 ID (예: https://youtu.be/dQw4w9WgXcQ)"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
              disabled={loading || analyzing}
            />
            <button
              type="submit"
              disabled={loading || analyzing || !input.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap"
            >
              {loading || analyzing ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                  </svg>
                  {loading ? "댓글 수집 중…" : "AI 분석 중…"}
                </>
              ) : (
                "분석 시작"
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>수집 댓글 수:</span>
            {[50, 100, 150, 200].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxResults(n)}
                className={`px-2.5 py-0.5 rounded-md border transition-all ${
                  maxResults === n
                    ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400"
                    : "border-white/10 hover:border-white/20 text-slate-500"
                }`}
              >
                {n}개
              </button>
            ))}
          </div>
        </form>

        {/* 오류 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {error}
          </div>
        )}

        {/* 영상 정보 배너 */}
        {videoData && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white/3 border border-white/8 rounded-xl">
            {videoData.thumbnailUrl && (
              <img
                src={videoData.thumbnailUrl}
                alt={videoData.videoTitle}
                className="w-full sm:w-40 h-24 object-cover rounded-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight mb-1 line-clamp-2">
                {videoData.videoTitle}
              </div>
              <div className="text-xs text-slate-400 mb-3">{videoData.channelTitle}</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-base font-bold">{formatNum(videoData.viewCount)}</div>
                  <div className="text-xs text-slate-500">조회수</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold">{formatNum(videoData.likeCount)}</div>
                  <div className="text-xs text-slate-500">좋아요</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold">{formatNum(videoData.commentCount)}</div>
                  <div className="text-xs text-slate-500">댓글</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 로딩 */}
        {loading && <Spinner label="YouTube 댓글을 수집하고 있습니다…" />}
        {analyzing && <Spinner label="OpenAI가 댓글을 분석하고 있습니다… (약 10~20초)" />}

        {/* 탭 + 본문 */}
        {(analysis || videoData) && !loading && !analyzing && (
          <>
            {/* 탭 */}
            <div className="flex gap-1 mb-6 border-b border-white/8 pb-0">
              {(
                [
                  { id: "dashboard", label: "대시보드" },
                  { id: "insights", label: "인사이트" },
                  { id: "comments", label: `댓글 목록 (${videoData?.comments.length ?? 0})` },
                ] as { id: Tab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── 대시보드 탭 ───────────────────────────────────── */}
            {activeTab === "dashboard" && analysis && videoData && (
              <div className="space-y-6">
                {/* KPI 핵심 지표 */}
                <section>
                  <h2 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-3">
                    핵심 지표
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiCard
                      value={`${analysis.sentimentScore > 0 ? "+" : ""}${analysis.sentimentScore}`}
                      label="감성 점수"
                      sub="-100(부정) ~ +100(긍정)"
                      valueColor={sentimentColor}
                    />
                    <KpiCard
                      value={`${analysis.sentimentBreakdown.positive}%`}
                      label="긍정 댓글 비율"
                      sub={`중립 ${analysis.sentimentBreakdown.neutral}% · 부정 ${analysis.sentimentBreakdown.negative}%`}
                      valueColor="#4ade80"
                    />
                    <KpiCard
                      value={`${engagementRate}%`}
                      label="좋아요 참여율"
                      sub="좋아요 / 조회수"
                    />
                    <KpiCard
                      value={`${commentRate}%`}
                      label="댓글 참여율"
                      sub="댓글 / 조회수"
                    />
                  </div>
                </section>

                {/* 감성 분포 + 주요 화제 */}
                <section>
                  <h2 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-3">
                    감성 분석
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 도넛 차트 */}
                    <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                      <div className="text-sm font-medium mb-4">댓글 감성 분포</div>
                      <div className="flex items-center gap-6">
                        <DonutChart
                          positive={analysis.sentimentBreakdown.positive}
                          neutral={analysis.sentimentBreakdown.neutral}
                          negative={analysis.sentimentBreakdown.negative}
                          score={analysis.sentimentScore}
                        />
                        <div className="space-y-3 flex-1">
                          <div className="text-center mb-2">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full border"
                              style={{
                                color: SENTIMENT_COLOR[analysis.sentimentOverall] || "#94a3b8",
                                borderColor: `${SENTIMENT_COLOR[analysis.sentimentOverall] || "#94a3b8"}40`,
                                background: `${SENTIMENT_COLOR[analysis.sentimentOverall] || "#94a3b8"}15`,
                              }}
                            >
                              {SENTIMENT_LABEL[analysis.sentimentOverall] || analysis.sentimentOverall}
                            </span>
                          </div>
                          {[
                            { label: "긍정", val: analysis.sentimentBreakdown.positive, color: "#4ade80" },
                            { label: "중립", val: analysis.sentimentBreakdown.neutral, color: "#475569" },
                            { label: "부정", val: analysis.sentimentBreakdown.negative, color: "#f87171" },
                          ].map(({ label, val, color }) => (
                            <div key={label} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400">{label}</span>
                                <span className="font-semibold" style={{ color }}>{val}%</span>
                              </div>
                              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${val}%`, background: color }}
                                />
                              </div>
                            </div>
                          ))}
                          <SentimentBar
                            positive={analysis.sentimentBreakdown.positive}
                            neutral={analysis.sentimentBreakdown.neutral}
                            negative={analysis.sentimentBreakdown.negative}
                          />
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>긍정</span>
                            <span>중립</span>
                            <span>부정</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 주요 화제 */}
                    <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                      <div className="text-sm font-medium mb-4">주요 화제 (언급 빈도)</div>
                      <HBarChart
                        items={analysis.keyTopics.map((t) => ({
                          label: t.topic,
                          value: t.count,
                          tag: t.sentiment,
                          tagColor:
                            t.sentiment === "positive"
                              ? "#4ade80"
                              : t.sentiment === "negative"
                                ? "#f87171"
                                : "#475569",
                        }))}
                      />
                      <div className="flex gap-3 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          긍정
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
                          중립
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                          부정
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 키워드 클라우드 */}
                <section>
                  <h2 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-3">
                    핵심 키워드
                  </h2>
                  <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                    <KeywordCloud keywords={analysis.keywords} />
                  </div>
                </section>

                {/* 전체 요약 */}
                <section>
                  <h2 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-3">
                    AI 요약
                  </h2>
                  <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-5 text-sm text-slate-200 leading-relaxed">
                    {analysis.summary}
                  </div>
                </section>
              </div>
            )}

            {/* ── 인사이트 탭 ───────────────────────────────────── */}
            {activeTab === "insights" && analysis && (
              <div className="space-y-6">
                {/* 긍정 하이라이트 & 우려 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-5">
                    <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-4">
                      긍정 하이라이트
                    </div>
                    <div className="space-y-4">
                      {analysis.highlights.map((h, i) => (
                        <div key={i} className="border-l-2 border-emerald-500/30 pl-3">
                          <p className="text-sm text-slate-200 mb-1 leading-relaxed">
                            &ldquo;{h.text}&rdquo;
                          </p>
                          <p className="text-xs text-emerald-400/60">{h.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-5">
                    <div className="text-xs font-medium text-red-400 uppercase tracking-wider mb-4">
                      우려 & 비판
                    </div>
                    <div className="space-y-4">
                      {analysis.concerns.length > 0 ? (
                        analysis.concerns.map((c, i) => (
                          <div key={i} className="border-l-2 border-red-500/30 pl-3">
                            <p className="text-sm text-slate-200 mb-1 leading-relaxed">
                              &ldquo;{c.text}&rdquo;
                            </p>
                            <p className="text-xs text-red-400/60">{c.reason}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          특별한 우려사항이 발견되지 않았습니다.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 시청자 프로필 */}
                <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                    시청자 프로필
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{analysis.viewerProfile}</p>
                </div>

                {/* 개선 제안 */}
                <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
                    콘텐츠 개선 제안
                  </div>
                  <ol className="space-y-3">
                    {analysis.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-400 font-medium">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-200 pt-0.5">{r}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* 참여 지표 상세 */}
                <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
                    참여 지표 분해
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {videoData && [
                      {
                        label: "좋아요 참여율",
                        val: parseFloat(engagementRate),
                        max: 10,
                        unit: "%",
                        note: "업계 평균 3~4%",
                        color: "#6366f1",
                      },
                      {
                        label: "댓글 참여율",
                        val: parseFloat(commentRate) * 100,
                        max: 10,
                        unit: "%",
                        note: "업계 평균 0.05%",
                        color: "#8b5cf6",
                      },
                      {
                        label: "긍정 댓글 비율",
                        val: analysis.sentimentBreakdown.positive,
                        max: 100,
                        unit: "%",
                        note: "전체 댓글 대비",
                        color: "#4ade80",
                      },
                    ].map((m) => (
                      <div key={m.label} className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">{m.label}</span>
                          <span className="font-semibold" style={{ color: m.color }}>
                            {m.label === "댓글 참여율"
                              ? commentRate
                              : m.label === "좋아요 참여율"
                                ? engagementRate
                                : m.val}
                            {m.unit}
                          </span>
                        </div>
                        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min((m.val / m.max) * 100, 100)}%`,
                              background: m.color,
                            }}
                          />
                        </div>
                        <div className="text-xs text-slate-600">{m.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 댓글 목록 탭 ──────────────────────────────────── */}
            {activeTab === "comments" && videoData && (
              <div className="space-y-2">
                {videoData.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-white/3 border border-white/8 rounded-xl p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {comment.authorProfileImageUrl ? (
                        <img
                          src={comment.authorProfileImageUrl}
                          alt={comment.author}
                          className="w-7 h-7 rounded-full shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-300">{comment.author}</span>
                          <span className="text-xs text-slate-600">
                            {new Date(comment.publishedAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                        <p
                          className="text-sm text-slate-200 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: comment.text }}
                        />
                        {(comment.likeCount > 0 || comment.replyCount > 0) && (
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                            {comment.likeCount > 0 && (
                              <span>좋아요 {formatNum(comment.likeCount)}</span>
                            )}
                            {comment.replyCount > 0 && (
                              <span>답글 {comment.replyCount}개</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 빈 화면 */}
        {!videoData && !loading && !analyzing && !error && (
          <div className="text-center py-24">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current text-slate-600">
                <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
              </svg>
            </div>
            <p className="text-slate-500 mb-1">YouTube URL을 입력하고 분석을 시작하세요</p>
            <p className="text-xs text-slate-700">예: https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>
          </div>
        )}
      </div>
    </div>
  );
}
