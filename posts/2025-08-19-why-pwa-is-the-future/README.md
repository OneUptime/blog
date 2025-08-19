# Native apps had a good run, but PWA has caught up and is the future. 

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: PWA, Web Architecture, Product, Platform Strategy

Description: Why Progressive Web Apps are the future and why OneUptime chose a PWA-first approach. Here's why PWAs now rival traditional native app strategies for most SaaS platforms, and why we at OneUptime intentionally chose a single PWA-first codebase instead of writing separate iOS and Android apps.

The debate between building native mobile apps vs. embracing the web isn’t new, but the balance has shifted. Modern Progressive Web Apps (PWAs) now deliver capabilities that were once exclusive to native platforms: offline resilience, rich caching, push notifications, installability, background sync, responsive performance, and deep integration hooks.

At OneUptime, we made a deliberate decision: **one codebase, web + mobile (installed PWA)**. No parallel native repositories. No duplicated features lagging behind. No separate deployment pipelines. Instead, we ship fast, own the full delivery surface, and keep users always on the latest version.

## Why we choose PWA-first strategy

### 1. One Codebase. All Screens.

Maintaining divergent native apps introduces product debt: feature parity drift, duplicated QA, divergent bugs, and slowed experimentation. With a PWA-first architecture:
- 100% shared UI + logic across desktop, tablet, and mobile
- Faster execution on roadmap because every feature ships once
- Design consistency (no “Android is behind” syndrome)
- Lower cognitive + operational load on engineering

> Every hour *not* spent babysitting two mobile codebases is an hour invested in core product value.

### 2. Mobile Capability Parity Has Arrived

The old objections ("but we need notifications", "but we need offline") are obsolete. For our use cases, the web delivers:
- Push Notifications (standards-based, reliable for our audience). Its much easier to implement and maintain than native push stacks on iOS, Android, and Windows. 
- Offline Storage & Caching (Service Workers + IndexedDB + Cache API)
- Add to Home Screen (install prompt + standalone window UX)
- Background Sync / Retry (so user intent persists through flaky networks)
- Fast cold loads via prefetch, code splitting, HTTP/3

For OneUptime, an operational / observability platform, these are exactly the capabilities we need. Native-only features (ARKit, hardcore GPU/accelerometer pipelines, ultra-low-latency BLE stacks) aren’t part of our value proposition.

### 3. Instant, Continuous Delivery

Native release cycles are gated by app store reviews, staged rollouts, and user inertia around updating. PWAs ship instantly:
- Fix a critical issue? Patch goes live in minutes.
- Roll out feature flags? You're not hostage to app store approval or “minimum version X”.
- Sunset risky code? Gone *now*, not in 3 user-update cycles.

> Velocity compounds. Rapid iteration is a strategic moat.

### 4. Direct Customer Relationship (No Gatekeepers)

App stores insert friction + control:
- Policy risk (sudden rule changes)
- Rejections delaying urgent fixes
- Forced UX or billing constraints

With a PWA, we own:
- Distribution
- Versioning
- Pricing & billing flows
- Messaging & lifecycle

No intermediary deciding what’s allowed, or taking a cut.

### 5. Zero App Store Tax

Revenue sharing (15–30%) is non-trivial. Even if you're not selling subscriptions *in-app* today, moving growth levers inside store constraints creates future lock-in. A pure web+PWA surface:
- Avoids platform tax
- Keeps pricing experiments fluid
- Preserves margin for infrastructure + innovation

### 6. Lower Total Cost of Ownership

Consider the native stack overhead:
- 2+ additional build pipelines
- Store asset management, screenshots, metadata chores
- Mobile-specific crash frameworks + error triage
- Separate test harnesses & device farms

A PWA strategy collapses this into a single, focused performance + reliability budget.

### 7. Better Onboarding & Conversion Funnels

No store detour. Users:
1. Click a link
2. Get value
3. (Optionally) Install

No forced commitment before first insight. Friction kills activation; the web removes it.

### 8. Performance Is a Product Discipline (Not a Platform Perk)

Native used to “feel faster” mostly because teams under-invested in web performance. Modern web tooling (preact/react + partial hydration, service worker precaching, HTTP/2 push/3 QUIC, edge rendering, CDN caching) eliminates that gap, if you treat performance as a first-class concern.

### 9. Security & Privacy Control

We control headers, CSP, dependency audits, token flows, without waiting for a store policy shift. **Sensitive enterprise customers prefer direct, transparent delivery.**

### 10. Future-Proof & Open

The web is backwards-compatible. HTML page that was built in 1990's still work as is! A native codebase ages; web endpoints + capabilities remain progressive. We evolve incrementally, not via forced rewrites.

### 11. One team to rule them all

- One team owns the entire user experience, from desktop to mobile.
- No need to juggle multiple teams, each with their own priorities and timelines.
- Saves time, resources and $ by focusing on a single codebase.

## Why PWAs Fit OneUptime’s Use Case Perfectly

OneUptime users need to:
- Acknowledge incidents quickly
- View dashboards & telemetry streams
- Receive real-time alerts
- Operate in low-connectivity / on-call scenarios

PWAs + service workers give us:

- Cached critical routes (incident lists, recent dashboards)
- Graceful offline fallback (read recent data, queue actions)
- Push notification delivery for alerts & escalations
- Installable, focused “app-like” shell on mobile home screens

Everything that matters to our users’ workflow is available, and fast.

## Common Objections (And Our Take)

| Objection | Our Perspective |
|-----------|-----------------|
| “Users expect us in the App Store” | Discovery SEO > Store search for our B2B niche. We can still wrap later if truly needed. |
| “Native performance is better” | For our interaction model (forms, dashboards, lists) optimized web is equivalent. |
| “Push isn’t universal” | Coverage across major mobile browsers now sufficient for our target base. |
| “Offline is harder on web” | Service worker patterns + replay queues solve our needs. |
| “We might need native apps someday” | We’ll add a minimal native shell only if a clear requirement emerges (e.g., deep OS integration). |


## When Native Still Makes Sense

Be pragmatic. If you need:
- Heavy 3D / graphics pipelines
- Deep sensor fusion (AR, ML on-device custom hardware acceleration)
- Ultra-low-latency audio/video or BLE streaming
Then native (or selective hybrid) might be justified. We're fortunate that's not our domain and PWA meets our needs perfectly.


## Final Thoughts

The web caught up, and in many SaaS / operational platforms, **PWAs are now not just “good enough,” they’re strategically superior.** For OneUptime, a unified PWA-first approach compounds velocity, reduces cost, and keeps us closer to users.

If you’re maintaining three frontends today (web, iOS, Android), ask: What would your roadmap look like if that energy collapsed into one? That future is available now.

---

*Curious how we implement parts of this stack? Let us know, we may publish deeper architecture dives (service worker strategy, offline queue design, push pipeline) next.*
