import { NextRequest, NextResponse } from "next/server";

export interface YoutubeComment {
  id: string;
  author: string;
  authorProfileImageUrl: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  replyCount: number;
}

function extractVideoId(input: string): string | null {
  const urlPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoInput = searchParams.get("videoId") || "";
  const maxResults = Math.min(
    parseInt(searchParams.get("maxResults") || "100"),
    200
  );

  const videoId = extractVideoId(videoInput);
  if (!videoId) {
    return NextResponse.json(
      { error: "유효한 YouTube 동영상 URL 또는 ID를 입력해 주세요." },
      { status: 400 }
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    // 동영상 정보 조회
    const videoRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`
    );
    const videoData = await videoRes.json();

    if (!videoData.items || videoData.items.length === 0) {
      return NextResponse.json(
        { error: "동영상을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const videoInfo = videoData.items[0];

    // 댓글 조회
    const comments: YoutubeComment[] = [];
    let pageToken = "";

    while (comments.length < maxResults) {
      const remaining = maxResults - comments.length;
      const pageSize = Math.min(remaining, 100);

      const url = new URL(
        "https://www.googleapis.com/youtube/v3/commentThreads"
      );
      url.searchParams.set("part", "snippet");
      url.searchParams.set("videoId", videoId);
      url.searchParams.set("maxResults", String(pageSize));
      url.searchParams.set("order", "relevance");
      url.searchParams.set("key", apiKey);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.error) {
        const msg = data.error.message || "YouTube API 오류가 발생했습니다.";
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      if (!data.items || data.items.length === 0) break;

      for (const item of data.items) {
        const snippet = item.snippet.topLevelComment.snippet;
        comments.push({
          id: item.id,
          author: snippet.authorDisplayName,
          authorProfileImageUrl: snippet.authorProfileImageUrl,
          text: snippet.textDisplay,
          likeCount: snippet.likeCount,
          publishedAt: snippet.publishedAt,
          replyCount: item.snippet.totalReplyCount,
        });
      }

      pageToken = data.nextPageToken || "";
      if (!pageToken) break;
    }

    return NextResponse.json({
      videoId,
      videoTitle: videoInfo.snippet.title,
      channelTitle: videoInfo.snippet.channelTitle,
      thumbnailUrl: videoInfo.snippet.thumbnails?.medium?.url || "",
      viewCount: videoInfo.statistics?.viewCount || "0",
      likeCount: videoInfo.statistics?.likeCount || "0",
      commentCount: videoInfo.statistics?.commentCount || "0",
      comments,
    });
  } catch {
    return NextResponse.json(
      { error: "댓글을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
