import { llmEndpoint, llmModel } from "../config.mjs";

export async function generateWeeklyComment(summary) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackComment(summary);
  }

  const prompt = [
    "你是一个温和、简洁的个人日程复盘助手。",
    "请根据用户本周日程完成情况，给出不超过80字的中文点评和鼓励。",
    `统计：总数 ${summary.total}，完成 ${summary.done}，未完成 ${summary.open}，完成率 ${summary.rate}%。`,
    `未完成事项：${summary.unfinishedTitles.join("；") || "无"}`
  ].join("\n");

  try {
    const response = await fetch(llmEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: llmModel,
        input: prompt
      })
    });

    if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
    const data = await response.json();
    const text = data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text).join("");
    return text?.trim() || fallbackComment(summary);
  } catch {
    return fallbackComment(summary);
  }
}

function fallbackComment(summary) {
  if (!summary.total) return "这一周还没有日程记录。下一周先安排一两件确定的小事，让节奏慢慢长出来。";
  if (summary.rate >= 90) return "这一周完成度很高，说明你的节奏已经比较稳定。继续保持，也记得给自己留一点恢复时间。";
  if (summary.rate >= 60) return "这一周推进得不错，还有几件事可以重新排序。先抓住最重要的一项，继续稳稳往前。";
  return "这一周可能被不少事情打断了。没关系，把目标收小一点，下一周从最容易启动的一件事开始。";
}
