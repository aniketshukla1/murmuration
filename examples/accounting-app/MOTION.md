# Ledgerly: motion brief

## Brief

1. **Signature:** a 3D desk built in code (Three.js, primitives only). One month's money is a stack of paper slips beside a paid invoice and an untidy pile of receipts. As you scroll, the invoice stands up to be read, the receipts sort themselves into three neat piles, the top quarter of the payment stack lifts off and glides into its own amber "tax pot" column, and finally the camera levels out over three columns standing on one ruled line: the books balance.
2. **Why this subject:** the verbs of bookkeeping are *set aside*, *sort* and *balance*. A freelancer's worry is that money in the account is not all theirs; the page shows it physically splitting before they spend it.
3. **Intensity: 3 of 10 (Quiet tier).** Money software has to feel calm and exact. The camera moves slowly and lands on framed compositions; nothing bounces, nothing loops.
4. **Supporting moves (four):**
   - the header mark's double rule (the accountant's "balanced" underline) is ruled once on load;
   - money figures in the example cards count up once to their real value;
   - the statement on the dark band fills in word by word as it is read;
   - the "Paid" stamp on the example invoice inks once when the card arrives.
5. **What drives it:** scroll chooses the stage (one per section) and the scene eases to it, settling within ~0.4 s; when scrolling stops between sections it settles on the nearest one. A fine pointer leans the camera a little. Touch gets the same scroll story; on phones the scene sits in the hero and dims behind text afterwards.
6. **At rest:** each section is complete as text plus a working example card (invoice, expenses, tax split). Without WebGL (or offline) a drawn SVG of the three balanced columns stands in. Under reduced motion the scene cuts between stages with no tweening, counters and stamps show final values, nothing loops.

**Category cliché avoided:** floating gold coins, rising-arrow charts, glowing "fintech" gradients. The material here is paper and ruled ink.

## Journey

| Section | What it says | What moves | Sky |
|---|---|---|---|
| Hero (stage 0) | Paid, kept, set aside | Invoice, payment stack, messy receipts on the desk | paper |
| Invoices (1) | Invoices that get paid | Invoice stands up to camera | paper |
| Expenses (2) | Receipts sort themselves | Receipts sort into three category piles | paper |
| Tax (3) | Tax set aside as you go | 26% of the stack lifts into the amber tax pot | paper |
| Statement band | Know what's yours to spend | scene dims; words fill | night (both themes) |
| Trust (4) | Built to be trusted | Columns level on one ruled line, camera front-on | paper |
| Pricing / FAQ | Start free | scene dims behind cards | paper |

## Tokens

```css
--dur-hover: 180ms;
--dur-reveal: 350ms;
--stagger: 40ms;
--ease-out: cubic-bezier(.2, .7, .2, 1);
```
Scene: damping `1 - exp(-dt * 9)`, per-slip stagger up to 0.35 of a transition, idle snap after 180 ms.

## Assumptions (no interview was held)

- US freelancers, US dollars, quarterly estimated tax; the 26% rate in examples is illustrative.
- No brand assets existed: name set in a system serif (Charter / Iowan / Georgia) for an established, bookish feel; ledger green `#1f5c45` with an amber accent reserved for tax.
- Pricing ($0 / $12), the 30-day trial and the security promises are placeholder copy that must be confirmed before launch.
- Light and dark themes, following the OS, with a toggle.
- Three.js 0.170 from jsDelivr through an import map; vendor it for production (see README in handover).
