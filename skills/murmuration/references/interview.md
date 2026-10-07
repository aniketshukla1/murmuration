# Interview: find the site the user can already see

A mind-blowing site starts from what the user pictures, not from what is easy to build. Before the motion brief, read the project if there is one, then ask questions shaped by their prompt and what you found, in two short rounds, then offer two or three directions to choose from. Use your agent's question tool when it has one, with options drawn from the subject and a free-text answer always possible; otherwise ask in a numbered list and wait.

## First, read the project

If the skill runs inside an existing project, understand it before asking anything. Read, in this order, and skim what is long:

- **What the product is:** the README, docs, an about page, pitch or product copy, pricing, FAQs. Note the subject's own words and verbs.
- **The brand:** logo files (SVG first), favicon, colour and type tokens in CSS or a theme file, fonts, any `DESIGN.md`, brand guidelines, an existing `MOTION.md`.
- **Assets that decide techniques:** photographs, video, product renders or turntables, 3D models (`.glb`, `.gltf`), illustration, icons; their sizes and licences when stated.
- **What already exists:** current pages and sections, the stack (plain HTML, or a framework in `package.json`), how it is built and where it is hosted, existing animation code or libraries.
- **Constraints written down:** accessibility notes, performance budgets, browser support, legal copy.

Then say what you learned in three to five lines (what it is, who it is for, what assets exist, what the stack is) before the first question, and let it shape the interview: skip what the project answers, and build options from its real products, places and words. If the project already uses a framework, ask whether the motion should live inside it or on a standalone page.

## How to ask

- **Only ask what the prompt and the project have not answered.** If they said "dark, like a film noir", or the project's tokens are already dark, don't ask about mood.
- **Make every option about their subject.** For a roastery: "warm and hand-made", "precise like a lab", "quiet luxury", "loud and playful". Generic options ("modern", "clean") produce generic sites.
- **At most four questions a round, two rounds.** Each question one line; add a one-line example when a term needs it.
- **Always offer "you decide"**, and when it is picked, say what you chose and why in one line.
- **Ask for pictures in words:** "Describe the first screen as if it were a shot in a film."

## Round 1: the vision

Choose up to four, the ones the prompt leaves open:

1. **The first five seconds.** What should someone feel when the page opens? (Offer three or four feelings that fit the subject, opposite enough to matter.)
2. **The picture.** How do they see the hero: the product up close, a place, a process happening, an abstract world, the words themselves? Ask them to describe it like a film shot.
3. **How much moves.** Quiet and assured, lively, or a show-stopper that people share? (This sets the intensity, 1 to 10.)
4. **References.** Sites, films, games, photographs or places that feel close, and what exactly they like in each (the pacing, a transition, the colour, the way the product turns).

## Round 2: what is real

Then the facts that decide what can be built:

5. **Assets.** What exists: the logo as SVG, brand colours and fonts, photography, video, product renders or a turntable, a 3D model, illustration? (No renders means no image sequence; no model means no 3D of their own product, though a 3D scene built in code still can be.)
6. **The story and the ask.** The sections or pages they need, the real facts and numbers to show, and the one thing a visitor should do (book, buy, sign up, read).
7. **Visitors and limits.** Mostly phones or desktops; accessibility needs; light, dark or both; anything that must load fast; where it will be hosted.
8. **Must and must not.** Anything they insist on, and anything they never want to see (no mascots, no autoplay sound, no stock video).

## Offer directions, then confirm

From the answers, write two or three directions that genuinely differ (different signature techniques, not three colour schemes). For each: a name, the signature in one sentence, why it fits this subject, the intensity, and what three sections look like in one line each. Ask which one, or which parts of each, they want. Then write the motion brief (`motion-language.md`) and `MOTION.md`, show the brief, and build.

## When not to interview

- The user says "just build it", "surprise me" or gives a complete brief: ask nothing, state your assumptions in two or three lines, and continue.
- Nobody can answer (a non-interactive run, an automated test, a pipeline): ask nothing; write the assumptions you made into `MOTION.md` under **Assumptions**, choose a direction yourself, and say in the final message which questions you would have asked.
- A small change to an existing site: ask only about that change.
