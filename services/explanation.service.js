function fallback(result) {
  const difference = result.signals[0] || 'This estimate uses local reference fares.';
  return (
    (result.verdict === 'Fair'
      ? 'Your quoted fare is within a reasonable range.'
      : result.verdict === 'Suspicious'
        ? 'Your quote is above the local expected range.'
        : 'Your quote is substantially above the local estimate.') +
    ' ' +
    difference +
    '. ' +
    result.signals[1] +
    '. Counter near ' +
    result.currency +
    result.counter_at +
    ' and consider walking away above ' +
    result.currency +
    result.walk_away_at +
    '.'
  );
}
async function explain(result) {
  if (!process.env.OPENAI_API_KEY) return fallback(result);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions:
          'Explain this deterministic fare verdict in exactly 3 concise sentences. Cite only values/signals/traps in the supplied JSON. Do not invent prices, reports, locations, or facts. Include one negotiation tip.',
        input: JSON.stringify(result),
        max_output_tokens: 160,
      }),
    });
    if (!response.ok) throw new Error('ChatGPT request failed');
    const body = await response.json(),
      text =
        body.output_text ||
        body.output?.flatMap((x) => x.content || []).find((x) => x.type === 'output_text')?.text;
    if (!text) throw new Error('ChatGPT returned no text');
    return text;
  } catch {
    return fallback(result);
  }
}
module.exports = { explain };
