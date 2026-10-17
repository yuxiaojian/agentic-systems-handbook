/* The captured session (2026-10-03): one client-delegation run with two order lookups.
   Times are seconds on the capture clock; T0 is session.started, so the replay shows t = wire - T0. */
const T0 = 21.145;

// [start, end] of voiced audio
const VOICE = {
  user: [[21.154, 21.515], [21.994, 22.594], [22.633, 23.714], [24.434, 24.915], [24.953, 25.753], [25.834, 25.994], [26.034, 26.275],
         [38.286, 38.485], [38.525, 38.685], [39.324, 39.885], [40.004, 40.285], [40.324, 41.404], [41.886, 42.963]],
  live: [[27.826, 29.424], [29.925, 34.864], [35.290, 36.429], [44.465, 45.610], [46.823, 52.067]],
};

// transcript deltas: [wire t, "in" | "out", text, session ms]
const WORDS = [
  [22.507, "in", " Hi", 800], [23.103, "in", ", can you", 1400], [23.505, "in", " check the", 1800], [23.976, "in", " status", 2200],
  [24.096, "in", " of", 2400], [24.278, "in", " my", 2600], [24.676, "in", " order", 3000], [25.493, "in", "? The", 3800],
  [25.671, "in", " number", 4000], [26.110, "in", " is", 4400], [26.376, "in", " one", 4600], [26.469, "in", " zero", 4800],
  [26.899, "in", " four", 5200], [27.209, "in", " two", 5600],
  [27.747, "out", " Sure,", 6000], [27.950, "out", " I'll", 6200], [28.106, "out", " check", 6400], [28.311, "out", " that", 6600],
  [28.515, "out", " right", 6800], [28.788, "out", " now.", 7000],
  [29.677, "out", " Your order", 8000], [29.873, "out", ",", 8200], [30.059, "out", " number", 8400], [30.469, "out", " one", 8800],
  [30.668, "out", " zero", 9000], [31.095, "out", " four", 9400], [31.456, "out", " two", 9800], [31.952, "out", ",", 10200],
  [32.144, "out", " for", 10400], [32.278, "out", " the", 10600], [32.483, "out", " two", 10800], [32.667, "out", " hiking", 11000],
  [33.065, "out", " backpacks", 11400], [33.715, "out", " has", 12000], [33.866, "out", " shipped", 12200], [34.648, "out", " and", 13000],
  [34.852, "out", " is expected", 13200], [35.372, "out", " on Thursday", 13800], [35.588, "out", ".", 14000],
  [39.562, "in", " Thanks", 18200], [40.349, "in", ". And", 19000], [40.550, "in", " what", 19200], [40.764, "in", " about", 19400],
  [41.056, "in", " order", 19800], [41.616, "in", " twenty", 20400], [41.793, "in", "-seventy", 20600], [42.337, "in", "-seven", 21200],
  [42.949, "in", "? When", 21800], [43.153, "in", " will", 22000], [43.388, "in", " that", 22200], [43.476, "in", " one", 22400],
  [43.914, "in", " arrive", 22800],
  [44.378, "out", " Right,", 23200], [44.589, "out", " I'll look", 23400], [44.786, "out", " that one", 23600], [45.031, "out", " up", 23800],
  [45.116, "out", " too.", 24000],
  [46.611, "out", " That", 25400], [46.696, "out", " order,", 25600], [47.150, "out", " for", 26000], [47.243, "out", " the standing", 26200],
  [47.872, "out", " desk", 26800], [48.062, "out", ", is", 27000], [48.257, "out", " delayed", 27200], [48.456, "out", " at", 27400],
  [48.731, "out", " the", 27600], [48.920, "out", " warehouse", 27800], [49.460, "out", " and now", 28400], [49.639, "out", " expected", 28600],
  [50.287, "out", " to arrive", 29200], [50.654, "out", " next", 29600], [51.048, "out", " Monday.", 30000],
];

const BACKEND_INSTR = "You are the order-lookup backend for a voice agent. Answer only from this data: {…}. Reply with one or two short sentences the voice agent can read aloud.";

// lane: live (client ⇄ Live socket) | backend (your app ⇄ backend model)
const EVENTS = [
  { t: 20.799, lane: "live", dir: "up", name: "session.start",
    json: { type: "session.start", session: { model: "gpt-live-1",
      instructions: "You are a voice support agent for an outdoor gear store. You cannot see order data. Whenever the user asks about an order, delegate to the backend, give a brief acknowledgment, then tell the user what the backend found. Keep replies short.",
      audio: { format: { type: "audio/pcm", rate: 24000 }, output: { voice: "marin" } }, delegation: { type: "client" } } } },
  { t: 21.145, lane: "live", dir: "down", name: "session.started",
    json: { type: "session.started", session: { id: "live_u7_EV2k…", model: "gpt-live-1", delegation: { type: "client" }, status: "active" } } },
  { t: 27.209, lane: "live", dir: "down", name: "session.delegation.created", key: true,
    json: { type: "session.delegation.created", offset_ms: 5600, delegation: { id: "item_EV2khK…", type: "delegation", target: "client" } } },
  { t: 27.461, lane: "backend", dir: "up", name: "POST /v1/responses",
    json: { model: "gpt-5.6-sol", instructions: BACKEND_INSTR,
      input: "Conversation so far:\nuser: Hi, can you check the status of my order? The number is one zero four two\n\nAnswer the user's latest request." } },
  { t: 28.665, lane: "backend", dir: "down", name: "200 OK",
    json: { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Order 1042, for two hiking backpacks, has shipped and is expected Thursday." }] }] } },
  { t: 28.667, lane: "live", dir: "up", name: "session.commentary.append", key: true,
    json: { type: "session.commentary.append", delegation_id: "item_EV2khK…", content: "Order 1042, for two hiking backpacks, has shipped and is expected Thursday.", event_id: "cmt_item_EV2khK…" } },
  { t: 29.062, lane: "live", dir: "down", name: "session.commentary.appended",
    json: { type: "session.commentary.appended", start_ms: 7400, end_ms: 7600, client_event_id: "cmt_item_EV2khK…" } },
  { t: 35.911, lane: "live", dir: "down", name: "session.usage.updated",
    json: { type: "session.usage.updated", usage: { seconds: 14 }, context_window: { usage_ratio: 0.0110546875 } } },
  { t: 43.914, lane: "live", dir: "down", name: "session.delegation.created", key: true,
    json: { type: "session.delegation.created", offset_ms: 22800, delegation: { id: "item_EV2kxP…", type: "delegation", target: "client" } } },
  { t: 44.165, lane: "backend", dir: "up", name: "POST /v1/responses",
    json: { model: "gpt-5.6-sol", instructions: BACKEND_INSTR,
      input: "Conversation so far:\nuser: Hi, can you check the status of my order? The number is one zero four two\nassistant: Sure, I'll check that right now. Your order, number one zero four two, for the two hiking backpacks has shipped and is expected on Thursday.\nuser: Thanks. And what about order twenty-seventy-seven? When will that one arrive\n\nAnswer the user's latest request." } },
  { t: 45.857, lane: "backend", dir: "down", name: "200 OK",
    json: { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Order two zero seven seven, for the standing desk, is delayed at the warehouse and is expected to arrive next Monday." }] }] } },
  { t: 45.859, lane: "live", dir: "up", name: "session.commentary.append", key: true,
    json: { type: "session.commentary.append", delegation_id: "item_EV2kxP…", content: "Order two zero seven seven, for the standing desk, is delayed at the warehouse and is expected to arrive next Monday.", event_id: "cmt_item_EV2kxP…" } },
  { t: 46.611, lane: "live", dir: "down", name: "session.commentary.appended",
    json: { type: "session.commentary.appended", start_ms: 25400, end_ms: 25600, client_event_id: "cmt_item_EV2kxP…" } },
  { t: 50.913, lane: "live", dir: "down", name: "session.usage.updated",
    json: { type: "session.usage.updated", usage: { seconds: 30 }, context_window: { usage_ratio: 0.0155 } } },
  { t: 53.737, lane: "live", dir: "up", name: "session.close", json: { type: "session.close" } },
  { t: 54.410, lane: "live", dir: "down", name: "session.closed",
    json: { type: "session.closed", reason: "close_requested", usage: { seconds: 33.0 } } },
];

// Per-turn timing, seconds after the user's last voiced audio. Used by the latency pages.
const TURNS = [
  { id: 1, detect: 0.934, fillerStart: 1.551, fillerEnd: 3.149, wait: 0.252, connect: 0.042, backend: 1.161, ack: 0.395, answer: 3.650 },
  { id: 2, detect: 0.951, fillerStart: 1.502, fillerEnd: 2.647, wait: 0.251, connect: 0.081, backend: 1.612, ack: 0.752, answer: 3.860 },
];
