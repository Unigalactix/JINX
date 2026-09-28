import { chapters, identities } from "./content.js";

export const moments = [
  {
    id: "moon", label: "The falling Moon", title: "Fifteen years of sky.",
    location: "Earth / 2165–2180", kicker: "The familiar becomes a threat", chapter: 1, duration: 24000, spoiler: false,
    line: "Move through the forecast. Watch the distance disappear.",
    description: "In 2165, the Moon becomes a deadline. Eight years remain for reliable launch planning; after 2173, its path becomes dangerously uncertain. Drag the timeline to feel the scale of that shrinking future.",
    canon: "The 15 years are the original forecast, not the actual impact date. This is a symbolic visualization, not an orbital simulation. Enable plot spoilers to reveal what happens.",
    revealed: "On December 21, 2177, the Moon breaks and its fragments strike Earth. The catastrophe devastates the planet, but does not split it apart. Some original humans survive in protected Earth refuges.",
    revealedCanon: "Forecast: 2165–2180. Safe launch-planning cutoff: 2173. Actual fragment strikes: December 21, 2177. The final years show the aftermath, not a second impact.",
  },
  {
    id: "blade", label: "The unstained blade", title: "Ten thousand silences.",
    location: "Orun / Ancient Earth", kicker: "One stranger. An impossible promise.", chapter: 0, duration: 22000, spoiler: true,
    line: "By sunset, only the blade is untouched.",
    description: "Ten thousand defeated soldiers wait on the salt plain. One stranger offers a terrible bargain: kill him and the others go free; scratch him and he will leave. By sunset, all ten thousand are dead. His blade remains clean.",
    canon: "An imagined sunrise establishes the day; the prologue's confrontation begins at noon and ends by sunset. The 10,000 field marks represent lives. Shadow combat and stylized blood on the scene's edges imply violence without depicting wounds. The blade stays clean.",
  },
  {
    id: "rain", label: "The red coastline", title: "The rain remembers.",
    location: "Torrey Pines / October 2171", kicker: "A seam in the evening", chapter: 4, duration: 16000, spoiler: true,
    line: "Iron. Salt. Something old released from a sealed room.",
    description: "Egon stands on a sharp-edged rock above the Pacific while red rain falls through the cold evening. The anomaly carries matter from the ancient massacre into modern California. The passage leads backward, not forward.",
    canon: "The opening is estimated at 666 seconds. Blood arrives through a spacetime anomaly, not ordinary evaporation. Distant lightning and optional thunder add atmosphere; the rain and blood remain stylized. Sound starts muted.",
  },
  {
    id: "identities", label: "Twelve within", title: "One life. Twelve voices.",
    location: "California / Egon Stein", kicker: "Learning to listen", chapter: 3, duration: 24000, spoiler: false,
    line: "Not twelve bodies. Not twelve superpowers.",
    description: "Egon's twelve identities share one dissociative system. His story moves from exhaustion and discontinuity toward communication, boundaries, and shared leadership. Choose a name, or play a gently changing sequence of visual focus.",
    canon: "This is an artistic portrait, not a clinical simulation of switching. DID is not a cause of violence. Treatment and cooperation do not erase identities; several are named but not separately developed in the draft.",
  },
  {
    id: "fleet", label: "The departure", title: "They leave. We stay.",
    location: "Earth / July 2172", kicker: "Five independent beginnings", chapter: 5, duration: 18000, spoiler: false,
    line: "Five ships. Five thousand dormant counterparts. No conscious crew.",
    description: "Five AI-operated ships carry dormant bodies and protected consciousness records into the dark. The source volunteers remain on Earth. What travels is the possibility of new lives, not an escape for the people who made them.",
    canon: "Mercy, Sequoia, Pacific, Lantern, and Peregrine carry 1,000 dormant counterparts each. The five trajectories are symbolic, not a claim that all ships launch simultaneously. REDO is 35 light-years away, not a 35-year voyage.",
  },
  {
    id: "zan", label: "The other rain", title: "This time, only water.",
    location: "Zan / September 2178", kicker: "A different beginning", chapter: 6, duration: 18000, spoiler: true,
    line: "An unfamiliar sky. A familiar sound.",
    description: "After arrival and safety checks, Egon's counterpart first becomes conscious on Zan. Clear rain falls beside the ocean Hades. The scene answers the red rain at Torrey Pines without pretending that the original life has continued.",
    canon: "This JINX scene shows Agape and Ales, the two moons described in the existing story. REDO Volume 1 later reveals four moons and two suns after arrival and full awakening. Mercy's awakenings take place September 3–18, 2178. JINX's events remain unchanged.",
  },
];

export const identityNotes = [
  "Egon learns to lead while listening to the others.",
  "Abel supports communication and shared presence during difficult moments.",
  "Mara insists on consent, boundaries, rest, and accountability.",
  "Kit uses drawings and direct questions, connecting the story to plants and ordinary care.",
  "Jonah is named, but not separately developed in the current draft.",
  "Inez helps maintain the shared calendar and continuity.",
  "Tomas expresses distrust of Rusk.",
  "Ada is named, but not separately developed in the current draft.",
  "Lewis is named, but not separately developed in the current draft.",
  "June is named, but not separately developed in the current draft.",
  "Sol is named, but not separately developed in the current draft.",
  "Nell initially communicates very little, then writes: “Please keep tomorrow.”",
];

export function lunarState(progress, spoilers) {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new RangeError("Scene progress must be between zero and one.");
  const year = Math.min(2180, 2165 + Math.floor(progress * 15 + 1e-7));
  return {
    year,
    impact: spoilers && year >= 2177,
    label: spoilers && year >= 2177 ?
      (year === 2177 ? "21 DEC 2177\nFRAGMENT STRIKES" : `${year}\nEARTH AFTER THE STRIKES`) :
      `${year}\n${year < 2173 ? "SAFE PLANNING WINDOW" : "UNCERTAIN ORBIT / FORECAST"}`,
  };
}

export function chooseOtherIdentity(current, random) {
  if (!Number.isInteger(current) || current < 0 || current >= identities.length || !Number.isFinite(random) || random < 0 || random >= 1) {
    throw new RangeError("Invalid identity selection.");
  }
  return (current + 1 + Math.floor(random * (identities.length - 1))) % identities.length;
}

export function bladeState(progress) {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new RangeError("Scene progress must be between zero and one.");
  const smooth = (value) => {
    const bounded = Math.min(1, Math.max(0, value));
    return bounded * bounded * (3 - 2 * bounded);
  };
  const combat = Math.min(1, Math.max(0, (progress - .5) / .44));
  const intensity = smooth(combat * 10) * (1 - smooth((combat - .86) / .14));
  const beat = combat * Math.PI * 14;
  const minutes = Math.round((6 + progress * 12) * 60);
  return {
    clock: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
    phase: progress < .12 ? "SUNRISE" : progress < .5 ? "THE WAITING HOURS" : progress < .57 ? "NOON" : progress < .94 ? "SHADOWS ON THE PLAIN" : "SUNSET",
    sunX: 162 + progress * 634,
    sunY: 260 - Math.sin(progress * Math.PI) * 186,
    daylight: Math.sin(progress * Math.PI) ** 1.4,
    dusk: smooth((progress - .64) / .36),
    combat, intensity,
    x: 538 + Math.sin(beat) * 172 * intensity,
    y: 232 - Math.abs(Math.sin(beat * 2)) * 19 * intensity,
    facing: intensity > .1 && Math.cos(beat) < 0 ? -1 : 1,
    lean: Math.cos(beat) * 15 * intensity,
    swing: -28 + Math.sin(beat * 2) * 87 * intensity,
    sweep: (Math.sin(beat * 2) + 1) / 2 * intensity,
    blood: smooth((combat - .08) / .7),
  };
}

export const thunderCues = [2.4, 7.5, 12.5];

export function stormState(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError("Invalid storm time.");
  const strike = thunderCues.findIndex((time) => seconds >= time && seconds <= time + 1.15);
  const age = strike < 0 ? 0 : (seconds - thunderCues[strike]) / 1.15;
  return { strike, light: strike < 0 ? 0 : Math.sin(age * Math.PI) ** 2 };
}

const skyStars = Array.from({ length: 75 }, (_, i) => {
  const x = (i * 137 + 43) % 960;
  const y = (i * 79 + 17) % 400;
  return `<circle cx="${x}" cy="${y}" r="${i % 9 === 0 ? 1.4 : .7}" opacity="${.15 + (i % 5) * .1}"/>`;
}).join("");

function svg(body, extraDefs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" focusable="false">
    <defs>
      <radialGradient id="mx-sky" cx="65%" cy="30%" r="80%"><stop stop-color="#263d41"/><stop offset=".48" stop-color="#142126"/><stop offset="1" stop-color="#0b1217"/></radialGradient>
      <radialGradient id="mx-moon" cx="27%" cy="22%" r="83%"><stop stop-color="#d1c9b0"/><stop offset=".3" stop-color="#898b76"/><stop offset=".66" stop-color="#3e504b"/><stop offset="1" stop-color="#182a2c"/></radialGradient>
      <radialGradient id="mx-earth" cx="35%" cy="10%" r="85%"><stop stop-color="#527c79"/><stop offset=".12" stop-color="#2b5055"/><stop offset=".45" stop-color="#162e3a"/><stop offset="1" stop-color="#080e16"/></radialGradient>
      <radialGradient id="mx-ember"><stop stop-color="#ffbd82" stop-opacity=".8"/><stop offset=".2" stop-color="#ce6344" stop-opacity=".45"/><stop offset="1" stop-color="#b85636" stop-opacity="0"/></radialGradient>
      <linearGradient id="mx-blade"><stop stop-color="#a7c4be" stop-opacity="0"/><stop offset=".65" stop-color="#e7f6e6"/><stop offset="1" stop-color="#fff9e3"/></linearGradient>
      <linearGradient id="mx-ocean" x2="0" y2="1"><stop stop-color="#385558"/><stop offset=".2" stop-color="#1c333b"/><stop offset="1" stop-color="#101b24"/></linearGradient>
      <linearGradient id="mx-red-sky" x2="0" y2="1"><stop stop-color="#18202a"/><stop offset=".5" stop-color="#533335"/><stop offset="1" stop-color="#b17155"/></linearGradient>
      <linearGradient id="mx-dawn" x2="0" y2="1"><stop stop-color="#263f4b"/><stop offset=".55" stop-color="#739391"/><stop offset="1" stop-color="#d8c5a0"/></linearGradient>
      <filter id="mx-blur"><feGaussianBlur stdDeviation="8"/></filter>
      <filter id="mx-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
      ${extraDefs}
    </defs>
    ${body}
  </svg>`;
}

function moonArt() {
  const fragments = Array.from({ length: 18 }, (_, i) => `<g data-fragment="${i}" opacity="0"><path d="M-8 -5 3 -12 13 1 4 9-9 6Z" fill="${i % 3 ? "#8c8270" : "#e0b58b"}"/><path d="M-30 -15-8 -5" stroke="#e48d62" stroke-width="2" opacity=".6"/></g>`).join("");
  return svg(`
    <rect width="960" height="540" fill="url(#mx-sky)"/><g fill="#e1e5cf">${skyStars}</g>
    <ellipse cx="485" cy="393" rx="393" ry="212" fill="none" stroke="#8bafaa" stroke-opacity=".12" transform="rotate(-23 485 393)"/>
    <path d="M773 89Q719 239 540 354" fill="none" stroke="#aab8a0" stroke-dasharray="3 9" opacity=".25"/>
    <circle cx="475" cy="785" r="467" fill="none" stroke="#77aeb0" stroke-width="22" opacity=".14" filter="url(#mx-blur)"/>
    <circle cx="475" cy="785" r="467" fill="url(#mx-earth)" stroke="#86aaa2" stroke-width="1.2"/>
    <path d="M245 392 270 374 316 358 362 372 385 391 420 390 441 418 409 439 430 461 386 480 326 451 299 454 279 425Z" fill="#728675" opacity=".18"/>
    <path d="M627 356 669 372 664 407 712 427 733 474 690 465 650 435 617 426 602 395Z" fill="#719486" opacity=".2"/>
    <g data-moon>
      <circle r="92" fill="#a3b8a0" opacity=".08" filter="url(#mx-blur)"/>
      <circle r="73" fill="url(#mx-moon)" stroke="#b3c3a9" stroke-opacity=".55"/>
      <g fill="#344941" opacity=".3"><ellipse cx="-19" cy="-21" rx="19" ry="16"/><circle cx="32" cy="-27" r="12"/><ellipse cx="13" cy="30" rx="24" ry="19"/><circle cx="-41" cy="21" r="8"/></g>
      <path d="M-12 -70-3 -36-16 -15 4 6-2 31 10 68" fill="none" stroke="#e2a06f" stroke-width="2" opacity=".6"/>
    </g>
    <g data-fragments>${fragments}</g>
    <ellipse data-impact cx="563" cy="343" rx="190" ry="90" fill="url(#mx-ember)" opacity="0"/>
    <g data-impact-lines opacity="0" fill="none" stroke="#e4a97a" stroke-width="1.2"><path d="M478 360Q555 309 653 357"/><path d="M440 379Q569 290 711 382"/><path d="M410 400Q573 284 764 412"/></g>
    <g font-family="Consolas,monospace" font-size="9" letter-spacing="2" fill="#aabbb1"><text x="777" y="93">LUNA</text><text x="735" y="424">EARTH</text></g>
    <g stroke="#94afa0" opacity=".3"><path d="M90 100h15m-7-7v14M850 320h15m-7-7v14"/></g>`);
}

function bladeArt() {
  const afterimages = Array.from({ length: 5 }, (_, i) => `<use data-blade-trail="${i}" href="#mx-stranger" opacity="0"/>`).join("");
  const opponents = Array.from({ length: 7 }, (_, i) => `<use data-blade-opponent="${i}" href="#mx-opponent" opacity="0"/>`).join("");
  const droplets = Array.from({ length: 32 }, (_, i) => {
    const x = i % 2 === 0 ? 8 + i * 7 % 102 : 951 - i * 11 % 98;
    const y = 75 + i * 31 % 286;
    return `<ellipse cx="${x}" cy="${y}" rx="${2 + i % 5}" ry="${3 + i % 8}" transform="rotate(${i * 23} ${x} ${y})"/>`;
  }).join("");
  return svg(`
    <rect width="960" height="540" fill="url(#mx-blade-dawn)"/>
    <rect data-blade-day width="960" height="540" fill="url(#mx-blade-noon)" opacity="0"/>
    <rect data-blade-dusk width="960" height="540" fill="url(#mx-blade-sunset)" opacity="0"/>
    <g data-blade-sun><circle r="92" fill="#efa46a" opacity=".13"/><circle r="57" fill="#edbb7c" opacity=".2" filter="url(#mx-blur)"/><circle data-sun-disc r="39" fill="#f6c78f"/></g>
    <g data-blade-clouds fill="#b48c77" opacity=".15"><path d="M-30 89Q210 44 398 103L386 112Q180 92-30 116Z"/><path d="M550 150Q790 98 1000 121L1000 139Q770 124 550 163Z"/></g>
    <path d="M0 232 47 216 67 197 85 222 145 232 211 190 240 223 294 222 329 204 375 232 450 241 568 213 656 227 737 210 816 226 877 200 960 222V540H0Z" fill="#262b29"/>
    <path data-blade-plain d="M0 300Q480 220 960 288V540H0Z" fill="#544d3d"/>
    <g transform="translate(80 245) scale(1 .28)" opacity=".65"><rect width="800" height="800" fill="url(#mx-ranks)" clip-path="url(#mx-survivors)"/></g>
    <ellipse data-blade-ground-shadow cx="0" cy="0" rx="80" ry="8" fill="#080e12" opacity=".6"/>
    <g data-blade-opponents>${opponents}</g>
    <g data-blade-trails>${afterimages}</g>
    <g data-blade-figure transform="translate(538 232)"><use href="#mx-stranger"/></g>
    <g data-blade-streaks>
      <path data-blade-arc d="M-156 86Q32-93 236 69Q76-30-73 113" fill="none" stroke="url(#mx-blade)" stroke-width="2" opacity="0"/>
      <path data-blade-echo d="M-172 102Q21-113 252 82" fill="none" stroke="#d9e3bd" stroke-width="9" opacity="0" filter="url(#mx-glow)"/>
      <path data-blade-speed d="M-216 67-56 53M-241 82-90 70M-174 104-42 85" fill="none" stroke="#a8b7a2" stroke-width="1" opacity="0"/>
    </g>
    <path d="M0 426 217 379 437 390 645 367 960 403V540H0Z" fill="#171f1f"/>
    <g data-blade-dust fill="#c1ab83">${Array.from({ length: 25 }, (_, i) => `<circle cx="${230 + i * 24}" cy="${281 + (i * 17) % 72}" r="${1 + i % 3}" opacity=".2"/>`).join("")}</g>
    <path d="M76 362 104 252 99 197M102 203l40 10-45 10" fill="#171e1d" stroke="#303c30" stroke-width="3"/>
    <path d="M861 366 833 266 829 215M830 222l-32 14 37 8" fill="#141c1c" stroke="#303c30" stroke-width="3"/>
    <g data-blood-screen opacity="0" fill="#85262b" stroke="#a43c39" stroke-width=".7">
      <path d="M0 99Q13 126 33 108Q47 99 35 116Q23 131 44 134Q61 139 37 144Q24 147 34 162Q43 182 22 163Q12 156 12 176Q9 193 5 170L0 161Z"/>
      <path d="M960 72Q943 104 928 83Q913 65 922 101Q925 109 904 113Q883 122 916 125Q929 128 913 143Q901 158 930 143Q940 139 941 164Q946 184 948 154Q949 140 960 149Z"/>
      <path d="M0 297Q14 318 22 297Q29 280 28 311Q33 322 45 310Q61 303 42 324Q38 330 49 338Q58 352 32 337Q24 335 25 350Q21 367 15 346Q7 335 0 352Z"/>
      <path d="M960 320Q949 334 940 313Q934 300 934 320Q931 329 919 326Q901 329 928 340Q939 345 928 357Q924 371 943 358Q953 351 960 371Z"/>
      ${droplets}
      <g data-blood-drips stroke="#75202a" stroke-width="3" stroke-linecap="round" fill="none"><path d="M27 149v40M935 134v62M13 330v35M948 350v25"/></g>
    </g>
  `, `
    <linearGradient id="mx-blade-dawn" x2="0" y2="1"><stop stop-color="#29263d"/><stop offset=".55" stop-color="#b37865"/><stop offset="1" stop-color="#cf9869"/></linearGradient>
    <linearGradient id="mx-blade-noon" x2="0" y2="1"><stop stop-color="#36535c"/><stop offset=".6" stop-color="#b3b498"/><stop offset="1" stop-color="#e0c797"/></linearGradient>
    <linearGradient id="mx-blade-sunset" x2="0" y2="1"><stop stop-color="#241e32"/><stop offset=".48" stop-color="#884641"/><stop offset="1" stop-color="#d17943"/></linearGradient>
    <pattern id="mx-ranks" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M4 1v5m-2-2 2-2 2 2" stroke="#c5b291" stroke-width="1.1"/></pattern>
    <clipPath id="mx-survivors"><rect data-ranks-width width="800" height="800"/></clipPath>
    <g id="mx-stranger">
      <path data-stranger-legs d="M-14 51-28 116-9 116 0 85 14 122 29 121 17 64 12 40Z" fill="#090f12"/>
      <path d="M-12 34-24 63-48 91-39 98-4 71 16 73 43 56 39 47 16 50 9 34Z" fill="#0a1013"/>
      <path d="M-10 32-12 16-3 7 8 10 13 22 7 35Z" fill="#0b1114"/>
      <path d="M-10 13-5 9 6 10" stroke="#a4b3a0" stroke-width="2"/>
      <path data-coat-blood d="M-11 42-3 48-7 64 3 58 12 69 6 78-7 73-11 87-18 83-12 65Z" fill="#782c31" opacity="0"/>
      <g data-sword transform="rotate(-28 39 52)"><path data-clean-blade d="M33 51 158 40 42 55Z" fill="url(#mx-blade)"/><path d="M32 43 37 60" stroke="#8ea79f" stroke-width="3"/></g>
      <path d="M-15 46-22 75" stroke="#547170" stroke-width="1.5"/>
    </g>
    <g id="mx-opponent" fill="#182022"><circle cx="0" cy="-55" r="7"/><path d="M-8-46-14-13-20 14-12 17 0-7 12 17 21 14 11-13 8-46Z"/><path d="M-8-40-26-20-22-15 0-29 19-17 23-23 9-41Z"/><path d="M20-24 23-86" stroke="#505c50" stroke-width="2"/></g>
  `);
}

function rainArt(clear = false) {
  const drops = Array.from({ length: 85 }, (_, i) => `<path data-drop="${i}" d="M0 0-5 22" stroke="${clear ? "#c1e5dc" : "#bc645b"}" stroke-width="${i % 4 === 0 ? 1.8 : .8}" opacity="${.12 + (i % 5) * .09}"/>`).join("");
  const moons = clear ? `<g data-zan-moons><circle cx="590" cy="119" r="49" fill="url(#mx-moon)" opacity=".82"/><circle cx="760" cy="162" r="18" fill="#c4baab" opacity=".72"/></g>` : `<path d="M154 156Q368 80 560 160T985 137" fill="none" stroke="#1b1b2b" stroke-width="49" opacity=".6"/><path data-anomaly d="M227 131 411 164 516 139 622 167 813 134" fill="none" stroke="#b38f83" stroke-width="2" opacity=".6"/>`;
  const lightning = clear ? "" : [345, 777, 201].map((x, i) => `
    <g data-lightning-strike="${i}" opacity="0" transform="translate(${x} 0)">
      <ellipse cx="0" cy="142" rx="138" ry="55" fill="#b6c4d1" opacity=".15" filter="url(#mx-blur)"/>
      <path d="M8 115-12 157 10 164-22 202-4 207-27 260M-7 184-38 197-49 222M-5 145 28 157 36 181" fill="none" stroke="#a6bdd4" stroke-width="7" opacity=".3" filter="url(#mx-glow)"/>
      <path d="M8 115-12 157 10 164-22 202-4 207-27 260M-7 184-38 197-49 222M-5 145 28 157 36 181" fill="none" stroke="#d2dce2" stroke-width="1.6" stroke-linejoin="round"/>
    </g>`).join("");
  return svg(`
    <rect width="960" height="540" fill="${clear ? "url(#mx-dawn)" : "url(#mx-red-sky)"}"/>
    ${moons}
    <g fill="${clear ? "#96b4b1" : "#2c2c3a"}" opacity=".5"><ellipse cx="103" cy="85" rx="252" ry="71"/><ellipse cx="770" cy="70" rx="278" ry="54"/><ellipse cx="451" cy="36" rx="160" ry="66"/></g>
    ${lightning}
    <path d="M0 269Q250 264 490 271T960 267V540H0Z" fill="url(#mx-ocean)"/>
    <path d="M0 272H960" stroke="${clear ? "#dbcba9" : "#b58774"}" opacity=".5"/>
    <g data-waves fill="none" stroke="${clear ? "#a2c8c0" : "#9f8378"}" opacity=".23">
      ${Array.from({ length: 12 }, (_, i) => `<path d="M${-80 + i * 8} ${283 + i * 17}q100 -9 190 0t190 0t190 0t190 0t190 0" stroke-width="${.5 + i * .06}"/>`).join("")}
    </g>
    ${clear ? "" : `<ellipse data-lightning-reflection cx="325" cy="309" rx="83" ry="30" fill="#bbccd4" opacity="0" filter="url(#mx-blur)"/>`}
    <path d="M960 247 861 234 821 246 791 224 750 250 700 281 739 330 799 326 845 352 960 361Z" fill="${clear ? "#324d4c" : "#303038"}"/>
    <path d="M405 540 451 405 496 378 553 291 580 281 610 354 639 409 724 470 741 540Z" fill="#151f26"/>
    <path d="M455 429 495 392 554 311 574 293 567 362 596 410 642 454" fill="none" stroke="${clear ? "#768b83" : "#876961"}" stroke-width="2" opacity=".6"/>
    <g data-rain-person transform="translate(571 267)">
      <path d="M-8-25-9-37-3-43 6-40 8-29 3-23Z" fill="#0d1720"/>
      <path d="M-8-24-13 5-8 17-15 40-7 42 2 18 7 36 14 38 8 8 8-19 2-24Z" fill="#101922"/>
      <path d="M-10-15-23 5-18 9-1-10M7-15 18 5" fill="none" stroke="#17232b" stroke-width="6"/>
      ${clear ? "" : `<path d="M-11-1 8 1M0 1Q29 22 67 63" fill="none" stroke="#9b9b88" stroke-width="1"/>`}
    </g>
    <g data-rain>${drops}</g>
    <g data-ripples fill="none" stroke="${clear ? "#b8dcd0" : "#b26758"}" opacity=".4">${Array.from({ length: 10 }, (_, i) => `<ellipse cx="${95 + i * 93}" cy="${320 + (i * 31) % 170}" rx="${8 + i % 4}" ry="2"/>`).join("")}</g>
    ${clear ? `<path d="M106 477q-4-45 17-69m-15 50q-30-27-34-9 8 16 34 9m5-18q32-23 37-5-11 15-37 5" fill="#607e64" stroke="#8da683" stroke-width="2"/>` : ""}
  `);
}

function identityArt() {
  const nodes = identities.map((name, i) => {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = 637 + Math.cos(angle) * 168;
    const y = 250 + Math.sin(angle) * 168;
    const lx = 637 + Math.cos(angle) * 207;
    const ly = 250 + Math.sin(angle) * 191;
    return `<g data-identity-node="${i}"><path d="M637 250 ${x} ${y}" stroke="#728b7f" stroke-opacity=".2"/><circle cx="${x}" cy="${y}" r="5" fill="#9eae95"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" fill="#9fae9f" font-family="Consolas,monospace" font-size="12">${name.toUpperCase()}</text></g>`;
  }).join("");
  return svg(`
    <rect width="960" height="540" fill="url(#mx-sky)"/>
    <g stroke="#75998c" stroke-opacity=".06">${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 64} 0V540M0 ${i * 40}H960"/>`).join("")}</g>
    <g fill="#d0dcc4">${skyStars}</g>
    <circle cx="637" cy="250" r="169" fill="none" stroke="#93ac90" stroke-opacity=".25"/>
    <circle cx="637" cy="250" r="141" fill="none" stroke="#94b3a5" stroke-opacity=".2" stroke-dasharray="1 9"/>
    <ellipse cx="637" cy="250" rx="217" ry="72" fill="none" stroke="#779184" stroke-opacity=".2" transform="rotate(-33 637 250)"/>
    ${nodes}
    <circle data-identity-halo cx="637" cy="250" r="117" fill="#8aa995" opacity=".1" filter="url(#mx-blur)"/>
    <path d="M568 343 570 297 552 275 547 226 552 188 572 162 607 150 645 154 672 175 681 195 679 218 696 245 684 253 681 277 665 291 637 291 635 323 680 348 696 407H542Z" fill="#0c191d" stroke="#839e8f" stroke-width="1.2" stroke-opacity=".7"/>
    <path d="M574 186Q614 161 655 187M580 191Q615 180 665 209M568 217Q605 195 666 228M568 238Q610 220 670 246M573 260Q612 250 661 267" fill="none" stroke="#6f8f80" stroke-opacity=".23"/>
    <path d="M651 218h15M680 263h-10" stroke="#b8c9b6" stroke-opacity=".55"/>
    <path d="M552 387 587 332 606 353 628 329 681 382" fill="none" stroke="#49685f" stroke-width="1.5"/>
    <g data-identity-pulse fill="none" stroke="#b8c9b6" stroke-opacity=".2"><circle cx="637" cy="250" r="125"/><circle cx="637" cy="250" r="130"/></g>`);
}

function fleetArt() {
  const ships = ["MERCY", "SEQUOIA", "PACIFIC", "LANTERN", "PEREGRINE"].map((name, i) => `
    <g data-ship="${i}">
      <path d="M0 10 0 115" stroke="#7fb6af" stroke-width="13" opacity=".06"/>
      <path d="M0 10 0 96" stroke="url(#mx-blade)" stroke-width="2" opacity=".6"/>
      <path d="M0-24 8-4 6 12 14 23 5 20 0 13-5 20-14 23-6 12-8-4Z" fill="#afb7a7" stroke="#c9d9c1" stroke-width=".6"/>
      <path d="M0-15V12" stroke="#3d5857" stroke-width="2"/>
      <text x="21" y="12" fill="#b3c5b6" font-family="Consolas,monospace" font-size="8" letter-spacing="1">${name}</text>
    </g>`).join("");
  return svg(`
    <rect width="960" height="540" fill="url(#mx-sky)"/><g fill="#d7e3d2">${skyStars}</g>
    <circle cx="215" cy="894" r="574" fill="none" stroke="#759e99" stroke-width="25" opacity=".12" filter="url(#mx-blur)"/>
    <circle cx="215" cy="894" r="574" fill="url(#mx-earth)" stroke="#a4b8a1" stroke-opacity=".5"/>
    <path d="M103 346 190 325 245 339 253 372 299 391 270 441 214 443 173 412 142 424 118 390Z" fill="#70927d" opacity=".2"/>
    <g fill="none" stroke="#8dac9a" stroke-opacity=".14">${Array.from({ length: 5 }, (_, i) => `<path d="M${250 + i * 76} 465Q${290 + i * 89} 310 ${360 + i * 100} 38" stroke-dasharray="2 8"/>`).join("")}</g>
    <g data-fleet>${ships}</g>
    <g data-fleet-signal fill="none" stroke="#a4c3ad" stroke-width="1"><ellipse cx="456" cy="358" rx="110" ry="26" opacity=".15"/><ellipse cx="456" cy="358" rx="165" ry="40" opacity=".09"/></g>
    <path d="M0 478 93 451 135 459 169 431 215 447 267 425 307 448 334 441 417 465 473 458 561 489V540H0Z" fill="#0b161b"/>
    <g fill="#b0b599" opacity=".45">${Array.from({ length: 24 }, (_, i) => `<rect x="${40 + i * 18}" y="${469 + i % 4 * 6}" width="2" height="2"/>`).join("")}</g>`);
}

function createArt(id) {
  switch (id) {
    case "moon": return moonArt();
    case "blade": return bladeArt();
    case "rain": return rainArt();
    case "identities": return identityArt();
    case "fleet": return fleetArt();
    case "zan": return rainArt(true);
    default: throw new Error(`Unknown moment: ${id}`);
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function setupMoments({ openChapter, revealSpoilers }) {
  const $ = (id) => document.getElementById(id);
  const art = $("moment-art");
  const screen = $("moment-screen");
  const range = $("moment-progress");
  const play = $("moment-play");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let selected = 0;
  let spoilers = false;
  let progress = 0;
  let running = false;
  let frame = null;
  let previousTime = null;
  let visible = false;
  let identity = 0;
  let lastIdentityStep = 0;
  let identityOrder = [...identities.keys()];
  let references = {};
  let audioEnabled = false;
  let audioContext = null;
  let thunderBuffer = null;
  let audioGeneration = 0;
  const activeThunder = new Set();
  const scene = () => moments[selected];
  const locked = () => scene().spoiler && !spoilers;
  const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  const announce = (text) => { $("moment-status").textContent = text; };

  function stopThunder() {
    for (const source of activeThunder) source.stop();
    activeThunder.clear();
    screen.dataset.thunderActive = "false";
  }

  function audioError(error) {
    console.error("Thunder audio could not play:", error);
    audioEnabled = false;
    stopThunder();
    syncControls();
    $("moment-audio-status").textContent = `Thunder sound is unavailable: ${error.message}. The visual scene still works.`;
  }

  function rumble() {
    if (!audioEnabled || audioContext?.state !== "running") return;
    const source = audioContext.createBufferSource();
    source.buffer = thunderBuffer;
    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(.38, now + .22);
    gain.gain.exponentialRampToValueAtTime(.001, now + 2.7);
    source.connect(filter).connect(gain).connect(audioContext.destination);
    source.addEventListener("ended", () => {
      activeThunder.delete(source);
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      screen.dataset.thunderActive = String(activeThunder.size > 0);
    }, { once: true });
    activeThunder.add(source);
    screen.dataset.thunderActive = "true";
    source.start();
  }

  function syncControls() {
    play.textContent = running ? "Pause scene" : "Play scene";
    play.setAttribute("aria-pressed", String(running));
    play.disabled = locked() || reduced.matches;
    $("moment-replay").disabled = locked();
    range.disabled = locked();
    $("moment-motion-note").textContent = reduced.matches ? "Reduced motion · use the slider" : "";
    screen.dataset.playing = String(running);
    $("moment-thunder").hidden = scene().id !== "rain" || locked();
    $("moment-thunder").disabled = reduced.matches;
    $("moment-thunder").textContent = audioEnabled ? "Mute thunder" : "Enable thunder";
    $("moment-thunder").setAttribute("aria-pressed", String(audioEnabled));
  }

  function pause() {
    running = false;
    previousTime = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    stopThunder();
    syncControls();
  }

  function setIdentity(index, notify = false) {
    identity = index;
    $("moment-line").textContent = identityNotes[index];
    $("moment-readout").textContent = `${identities[index].toUpperCase()}\n${String(index + 1).padStart(2, "0")} / 12 IDENTITIES`;
    for (const button of $("moment-identities").children) button.setAttribute("aria-pressed", String(Number(button.dataset.identity) === index));
    for (const group of references.nodes ?? []) {
      const active = Number(group.dataset.identityNode) === index;
      group.querySelector("circle").setAttribute("r", active ? "9" : "4");
      group.querySelector("circle").setAttribute("fill", active ? "#e9aa85" : "#779688");
      group.querySelector("text").setAttribute("fill", active ? "#f5dcc1" : "#91a696");
      group.querySelector("path").setAttribute("stroke-opacity", active ? ".65" : ".14");
    }
    if (notify) announce(`${identities[index]}. ${identityNotes[index]}`);
  }

  function draw() {
    range.value = String(Math.round(progress * 1000));
    $("moment-progress-output").value = `${Math.round(progress * 100)}%`;
    range.setAttribute("aria-valuetext", `${Math.round(progress * 100)} percent`);
    screen.dataset.progress = progress.toFixed(3);
    if (locked()) return;
    const time = progress * scene().duration / 1000;
    if (scene().id === "moon") {
      const state = lunarState(progress, spoilers);
      const approach = Math.min(1, progress / .8);
      const x = 754 - approach * 205;
      const y = 130 + approach * 101;
      references.moon.setAttribute("transform", `translate(${x} ${y}) scale(${.76 + approach * .48})`);
      references.moon.setAttribute("opacity", state.impact ? "0" : "1");
      const after = Math.min(1, Math.max(0, (progress - .8) / .14));
      references.fragments.forEach((fragment, i) => {
        const angle = i * 2.399963;
        const spread = (14 + (i * 13) % 53) * (1 + after * 2);
        fragment.setAttribute("transform", `translate(${549 + Math.cos(angle) * spread} ${231 + Math.sin(angle) * spread * .65 + after * (90 + (i * 23) % 70)}) rotate(${i * 41}) scale(${(.6 + i % 3 * .25) * (1 - after * .6)})`);
        fragment.setAttribute("opacity", state.impact ? String(1 - after * .85) : "0");
      });
      references.impact.setAttribute("opacity", state.impact ? String(.9 - after * .65) : "0");
      references.impactLines.setAttribute("opacity", state.impact ? String(.6 - after * .4) : "0");
      $("moment-readout").textContent = state.label;
      $("moment-progress-output").value = String(state.year);
      range.setAttribute("aria-valuetext", `${state.year}. ${state.label.split("\n")[1]}`);
    } else if (scene().id === "blade") {
      const state = bladeState(progress);
      const pose = (sample) => `translate(${sample.x} ${sample.y}) scale(${sample.facing} 1) rotate(${sample.lean} 0 80)`;
      references.sun.setAttribute("transform", `translate(${state.sunX} ${state.sunY})`);
      references.day.setAttribute("opacity", String(state.daylight));
      references.dusk.setAttribute("opacity", String(state.dusk));
      references.clouds.setAttribute("transform", `translate(${progress * -65} 0)`);
      references.plain.setAttribute("fill", `rgb(${73 + Math.round(state.daylight * 37)} ${65 + Math.round(state.daylight * 35)} ${51 + Math.round(state.daylight * 20)})`);
      references.shadow.setAttribute("transform", `translate(${state.x + (progress - .5) * 132} 357) scale(${.4 + Math.abs(progress - .5) * 2.8} 1)`);
      references.figure.setAttribute("transform", pose(state));
      references.trails.forEach((trail, i) => {
        trail.setAttribute("transform", pose(bladeState(Math.max(0, progress - (i + 1) * .006))));
        trail.setAttribute("opacity", String(state.intensity * (.24 - i * .04)));
      });
      references.opponents.forEach((opponent, i) => {
        const beat = (state.combat * 7 + i * .14) % 1;
        const retreat = Math.max(0, (beat - .55) / .45);
        opponent.setAttribute("transform", `translate(${315 + i * 71 + Math.sin(beat * Math.PI * 2) * 17} ${333 + i % 3 * 11}) rotate(${retreat * (i % 2 ? -65 : 65)} 0 12)`);
        opponent.setAttribute("opacity", String(state.intensity * (1 - retreat)));
      });
      references.ranks.setAttribute("width", String(800 * (1 - state.combat)));
      references.sword.setAttribute("transform", `rotate(${state.swing} 39 52)`);
      references.streaks.setAttribute("transform", pose(state));
      references.arc.setAttribute("opacity", String(state.sweep * .66));
      references.echo.setAttribute("opacity", String(state.sweep * .1));
      references.speed.setAttribute("opacity", String(state.intensity * .4));
      references.dust.setAttribute("transform", `translate(${Math.sin(state.combat * 30) * state.intensity * 18} ${-state.combat * 22})`);
      references.blood.setAttribute("opacity", String(state.blood * .83));
      references.drips.setAttribute("transform", `translate(0 ${state.blood * 23})`);
      references.coat.setAttribute("opacity", String(state.blood * .7));
      $("moment-readout").textContent = `${state.phase}\n${progress >= .94 ? "THE BLADE IS CLEAN" : `${state.clock} / ORUN`}`;
      $("moment-progress-output").value = state.clock;
      range.setAttribute("aria-valuetext", `${state.clock}. ${state.phase}`);
    } else if (["rain", "zan"].includes(scene().id)) {
      references.drops.forEach((drop, i) => {
        const x = (i * 131 + 29) % 1000;
        const y = ((i * 67 + time * (62 + i % 7 * 9)) % 620) - 60;
        drop.setAttribute("transform", `translate(${x} ${y})`);
      });
      references.waves.setAttribute("transform", `translate(${Math.sin(time * .5) * 13} 0)`);
      references.ripples.setAttribute("opacity", String(.22 + Math.sin(time * 1.5) * .09));
      if (references.anomaly) references.anomaly.setAttribute("opacity", String(.38 + Math.sin(time * .7) * .12));
      if (scene().id === "rain") {
        const storm = stormState(time);
        references.lightning.forEach((strike, index) => strike.setAttribute("opacity",
          String(index === storm.strike ? storm.light * .78 : 0)));
        references.reflection.setAttribute("cx", String([325, 757, 181][Math.max(0, storm.strike)]));
        references.reflection.setAttribute("opacity", String(storm.light * .1));
      }
      $("moment-readout").textContent = scene().id === "rain" ? "666 SECONDS\nTHE PASSAGE OPENS" : "AGAPE + ALES\nTHE SKY SHOWN IN JINX";
    } else if (scene().id === "identities") {
      const step = Math.min(11, Math.floor(progress * 12));
      if (step !== lastIdentityStep) { lastIdentityStep = step; setIdentity(identityOrder[step]); }
      references.pulse.setAttribute("transform", `translate(637 250) scale(${1 + Math.sin(time) * .035}) translate(-637 -250)`);
      references.halo.setAttribute("opacity", String(.09 + Math.sin(time) * .025));
    } else if (scene().id === "fleet") {
      references.ships.forEach((ship, i) => {
        const travel = Math.max(0, Math.min(1, (progress - i * .055) / .78));
        const x = 362 + i * 77 + travel * (i - 1) * 30;
        const y = 321 - i * 10 - travel * (240 + i * 8);
        ship.setAttribute("transform", `translate(${x} ${y}) rotate(${(i - 1) * 9}) scale(${1 - travel * .32})`);
      });
      references.signal.setAttribute("opacity", String(1 - progress * .8));
      $("moment-readout").textContent = "05 SHIPS / 5,000 DORMANT\n00 CONSCIOUS PASSENGERS";
    }
  }

  function collectReferences() {
    const find = (selector) => art.querySelector(selector);
    references = {
      moon: find("[data-moon]"), fragments: art.querySelectorAll("[data-fragment]"),
      impact: find("[data-impact]"), impactLines: find("[data-impact-lines]"),
      ranks: find("[data-ranks-width]"), sword: find("[data-sword]"), arc: find("[data-blade-arc]"), echo: find("[data-blade-echo]"), dust: find("[data-blade-dust]"),
      sun: find("[data-blade-sun]"), day: find("[data-blade-day]"), dusk: find("[data-blade-dusk]"), clouds: find("[data-blade-clouds]"),
      plain: find("[data-blade-plain]"), shadow: find("[data-blade-ground-shadow]"), figure: find("[data-blade-figure]"),
      trails: art.querySelectorAll("[data-blade-trail]"), opponents: art.querySelectorAll("[data-blade-opponent]"),
      streaks: find("[data-blade-streaks]"), speed: find("[data-blade-speed]"),
      blood: $("moment-blood-overlay").querySelector("[data-blood-screen]"), drips: $("moment-blood-overlay").querySelector("[data-blood-drips]"), coat: find("[data-coat-blood]"),
      drops: art.querySelectorAll("[data-drop]"), waves: find("[data-waves]"), ripples: find("[data-ripples]"), anomaly: find("[data-anomaly]"),
      lightning: art.querySelectorAll("[data-lightning-strike]"), reflection: find("[data-lightning-reflection]"),
      nodes: art.querySelectorAll("[data-identity-node]"), pulse: find("[data-identity-pulse]"), halo: find("[data-identity-halo]"),
      ships: art.querySelectorAll("[data-ship]"), signal: find("[data-fleet-signal]"),
    };
  }

  function select(index, notify = true) {
    if (!Number.isInteger(index) || index < 0 || index >= moments.length) throw new RangeError("Unknown moment index.");
    pause();
    audioEnabled = false;
    audioGeneration++;
    $("moment-audio-status").textContent = "";
    selected = index;
    progress = 0;
    identity = 0;
    lastIdentityStep = 0;
    identityOrder = [...identities.keys()];
    const current = scene();
    const isLocked = locked();
    screen.dataset.scene = current.id;
    screen.dataset.locked = String(isLocked);
    $("moment-title").textContent = current.title;
    $("moment-location").textContent = current.location;
    $("moment-record").textContent = `FRAGMENT ${String(index + 1).padStart(2, "0")} / 06`;
    $("moment-kicker").textContent = current.kicker;
    $("moment-line").textContent = current.line;
    $("moment-readout").textContent = "";
    $("moment-lock").hidden = !isLocked;
    $("moment-chapter").textContent = `${chapters[current.chapter].number} / ${chapters[current.chapter].title}`;
    $("moment-description").textContent = isLocked ? "This record contains a major reveal. Enable plot spoilers to explore its animation and scene description, or open the chapter to discover it in the story." :
      current.id === "moon" && spoilers ? current.revealed : current.description;
    $("moment-canon").textContent = isLocked ? "The visual and its outcome stay hidden while plot spoilers are off." :
      current.id === "moon" && spoilers ? current.revealedCanon : current.canon;
    $("moment-progress-label").textContent = current.id === "moon" ? "2165–2180" : current.id === "blade" ? "Sunrise–sunset" : "Scene progress";
    range.setAttribute("aria-label", current.id === "moon" ? "Lunar timeline, 2165 to 2180" : current.id === "blade" ? "Orun, sunrise to sunset" : "Scene progress");
    $("moment-identities").hidden = current.id !== "identities";
    $("moment-random").hidden = current.id !== "identities";
    for (const [tabIndex, button] of [...$("moment-selector").children].entries()) {
      button.setAttribute("aria-pressed", String(tabIndex === index));
      button.dataset.locked = String(moments[tabIndex].spoiler && !spoilers);
      button.querySelector("span").textContent = `${String(tabIndex + 1).padStart(2, "0")} / ${moments[tabIndex].spoiler && !spoilers ? "SPOILERS" : "EXPLORE"}`;
    }
    // Only fixed, locally authored SVG markup enters this decorative container.
    art.innerHTML = isLocked ? "" : createArt(current.id);
    $("moment-blood-overlay").replaceChildren();
    if (current.id === "blade" && !isLocked) {
      const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      overlay.setAttribute("viewBox", "0 0 960 540");
      overlay.setAttribute("preserveAspectRatio", "none");
      overlay.setAttribute("focusable", "false");
      overlay.append(art.querySelector("[data-blood-screen]"));
      $("moment-blood-overlay").append(overlay);
    }
    collectReferences();
    if (current.id === "identities") setIdentity(0);
    draw();
    syncControls();
    if (notify) announce(`${current.label}${isLocked ? ". Plot spoilers are hidden." : ". Ready to explore."}`);
  }

  function tick(timestamp) {
    if (!running) return;
    const oldSeconds = progress * scene().duration / 1000;
    if (previousTime !== null) progress = Math.min(1, progress + Math.min(timestamp - previousTime, 100) / scene().duration);
    previousTime = timestamp;
    draw();
    if (scene().id === "rain" && audioEnabled) {
      const newSeconds = progress * scene().duration / 1000;
      if (thunderCues.some((cue) => oldSeconds < cue + .55 && newSeconds >= cue + .55)) rumble();
    }
    if (progress >= 1) { pause(); announce("Scene complete. Replay or choose another moment."); }
    else frame = requestAnimationFrame(tick);
  }

  function start() {
    if (locked() || reduced.matches || !visible || document.hidden) return;
    if (audioEnabled && audioContext.state !== "running") {
      const generation = audioGeneration;
      audioContext.resume().catch((error) => { if (generation === audioGeneration) audioError(error); });
    }
    if (progress >= 1) progress = 0;
    if (scene().id === "identities" && progress === 0) {
      identityOrder = [...identities.keys()];
      for (let i = identityOrder.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [identityOrder[i], identityOrder[j]] = [identityOrder[j], identityOrder[i]];
      }
      lastIdentityStep = -1;
      draw();
    }
    running = true;
    previousTime = null;
    syncControls();
    frame = requestAnimationFrame(tick);
  }

  for (const [index, moment] of moments.entries()) {
    const button = element("button", "moment-tab");
    button.type = "button";
    button.dataset.moment = moment.id;
    button.setAttribute("aria-controls", "moment-screen");
    button.append(element("span"), element("strong", "", moment.label));
    button.addEventListener("click", () => select(index));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? moments.length - 1 :
        (index + (event.key === "ArrowRight" ? 1 : -1) + moments.length) % moments.length;
      select(next);
      $("moment-selector").children[next].focus();
    });
    $("moment-selector").append(button);
  }
  identities.forEach((name, index) => {
    const button = element("button", "", name);
    button.type = "button";
    button.dataset.identity = String(index);
    button.addEventListener("click", () => {
      pause();
      identityOrder = [...identities.keys()];
      progress = index / 12;
      lastIdentityStep = index;
      draw();
      setIdentity(index, true);
    });
    $("moment-identities").append(button);
  });
  play.addEventListener("click", () => { if (running) pause(); else start(); });
  $("moment-thunder").addEventListener("click", async () => {
    const generation = ++audioGeneration;
    if (audioEnabled) {
      audioEnabled = false;
      stopThunder();
      syncControls();
      return;
    }
    try {
      if (!window.AudioContext) throw new Error("This browser does not support Web Audio");
      if (!audioContext) {
        audioContext = new AudioContext();
        thunderBuffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * 2.8), audioContext.sampleRate);
        const samples = thunderBuffer.getChannelData(0);
        let low = 0;
        for (let i = 0; i < samples.length; i++) {
          low = (low + .035 * (Math.random() * 2 - 1)) / 1.035;
          samples[i] = low * 4;
        }
      }
      await audioContext.resume();
      if (generation !== audioGeneration || scene().id !== "rain" || locked() || reduced.matches) return;
      audioEnabled = true;
      $("moment-audio-status").textContent = "";
      syncControls();
      announce("Thunder sound enabled. It plays only while this scene is playing.");
    } catch (error) {
      if (generation === audioGeneration) audioError(error);
    }
  });
  $("moment-replay").addEventListener("click", () => {
    pause();
    progress = 0;
    if (scene().id === "identities") { identityOrder = [...identities.keys()]; lastIdentityStep = -1; }
    draw();
    start();
  });
  $("moment-random").addEventListener("click", () => {
    pause();
    identityOrder = [...identities.keys()];
    const next = chooseOtherIdentity(identity, random());
    progress = next / 12;
    lastIdentityStep = next;
    draw();
    setIdentity(next, true);
  });
  range.addEventListener("input", () => {
    pause();
    progress = Number(range.value) / 1000;
    draw();
  });
  $("moment-read").addEventListener("click", () => { pause(); openChapter(scene().chapter); });
  $("moment-reveal").addEventListener("click", () => {
    revealSpoilers();
    (reduced.matches ? range : play).focus();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  document.addEventListener("jinx:reader-open", pause);
  reduced.addEventListener("change", () => { pause(); draw(); });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) pause();
  }, { threshold: .12 });
  observer.observe(screen);
  $("moments-experience").hidden = false;
  select(0, false);
  return {
    setSpoilers(value) {
      spoilers = Boolean(value);
      select(selected, false);
    },
  };
}
