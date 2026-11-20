# The Scribe — One Story of Every Scripture

A 3D browser RPG (Three.js) by VNC Labs. You play the one soul who wrote every scripture, across 14 chapters on one timeline.

- Chapters 1–3 are free; chapters 4–14 unlock with a one-time Stripe purchase.
- `server.js` serves `public/` and verifies Stripe Checkout sessions (no dependencies).

## Environment variables (Railway)
| Name | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Restricted key with **Checkout Sessions: Read** |
| `PAYMENT_LINK` | Stripe Payment Link URL |
| `UNLOCK_SECRET` | Random string used to sign unlock tokens |
| `PRICE_LABEL` | e.g. `$4.99` |
| `FREE_CHAPTERS` | default `3` |
| `UNLOCK_CODES` | optional comma list of giveaway / education codes |
