# AI Writes Your Code. Who Watches It Run?

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, AI, DevOps, SRE, Monitoring

Description: AI is generating more production code than ever. But shipping faster without watching closer is a recipe for silent failures, cascading outages, and midnight pages.

GPT-5.3 dropped this week. Anthropic built a 100,000-line C compiler with AI agents in two weeks. Google and Microsoft say 25-30% of new code is AI-generated. Microsoft's CTO predicts 95% by 2030.

The conversation right now is about verification: can we prove AI-generated code is correct? That is an important question. But it misses something equally critical.

Correct code still fails in production.

## The Verification Gap Is Not the Only Gap

Formal verification tells you the logic is sound. It does not tell you that your database connection pool is exhausted at 3 AM because traffic spiked 4x after a Product Hunt launch. It does not catch the memory leak that only appears after 72 hours of sustained load. It does not alert you when a third-party API your AI-generated integration depends on starts returning 500s.

Production is where code meets reality. And reality is messy.

The real question is not just "who verifies AI-written code?" It is: who watches it run?

## More Code, Faster. Same Ops Team.

Here is what is actually happening at most companies right now:

1. **AI accelerates code production 5-10x.** Teams that shipped weekly now ship daily. Features that took sprints now take hours.
2. **Deployment frequency increases.** More code means more deploys. More deploys means more potential failure points.
3. **Ops teams stay the same size.** Nobody is hiring 5-10x more SREs to match the increase in code velocity.

This is the real crisis. Not that AI writes buggy code (though it does). The crisis is that the ratio of "things that can break" to "people watching for breakage" is getting worse every single week.

Andrej Karpathy described his workflow: "I 'Accept All' always, I don't read the diffs anymore." If the person who coined "vibe coding" is not reading diffs, your team is not reading them either. The code is shipping. The monitoring has not caught up.

## What Breaks When Nobody Is Watching

AI-generated code introduces failure patterns that traditional monitoring misses:

**Silent behavioral drift.** An AI refactor passes all tests but subtly changes how a caching layer behaves. Response times creep up 200ms. No alert fires because no threshold was breached. Customer satisfaction drops for two weeks before anyone notices.

**Dependency sprawl.** AI tends to solve problems by adding libraries. Each new dependency is a new attack surface, a new thing that can break, a new upstream maintainer who might push a bad release. Your dependency tree just grew 3x and your monitoring still only watches your code.

**Confidence-driven blind spots.** When a senior engineer writes a tricky function, they think about edge cases. They add logging. They write defensive code. AI generates clean, confident code that handles the happy path beautifully and falls apart on the edges. The code looks so good that reviewers (if they review at all) assume it is solid.

**Volume-driven alert fatigue.** More deploys means more alerts. If your alerting is not intelligent, your on-call engineers drown. They start ignoring pages. The critical alert gets lost in the noise.

## The Observability Stack Needs to Match Code Velocity

If AI is writing code 10x faster, your observability needs to be 10x smarter. Not 10x more dashboards. Smarter.

That means:

**Automated anomaly detection, not just threshold alerts.** Static thresholds fail when deployment patterns change weekly. You need systems that learn what "normal" looks like and flag deviations automatically.

**Deployment-correlated monitoring.** Every deploy should automatically trigger a monitoring window. If error rates spike within 30 minutes of a deploy, you need to know immediately, not after the customer complaints roll in.

**Full-stack visibility in one place.** When your AI generates a new microservice that talks to three APIs, creates a database table, and exposes two endpoints, you cannot afford to check five different tools to understand what happened when it breaks. Uptime monitoring, APM, logs, error tracking, and incident management need to live together.

**Incident response that scales.** When things break (and they will break more often, because more code is shipping), your incident response cannot depend on one hero engineer who knows the whole system. You need automated on-call routing, status pages that update stakeholders, and runbooks that capture institutional knowledge.

## The Counterintuitive Truth

Here is what most people get wrong: they think AI-generated code means less need for monitoring. "The AI tested it. The AI verified it. Ship it."

The opposite is true.

AI-generated code means more code, shipping faster, to production environments that are increasingly complex. The humans who used to be the safety net (code reviewers, QA engineers, careful deployers) are being removed from the loop. Not maliciously. Just inevitably. When code generation is nearly free, the bottleneck is not writing code. It is understanding what your code does in production.

Observability is not overhead. It is the only way to maintain confidence in systems that are changing faster than any human can track.

## What to Do About It

If your team is using AI to write code (and at this point, who is not), here is a practical checklist:

1. **Audit your monitoring-to-deploy ratio.** How many deploys per week vs. how many things are actively monitored? If deploys went up 5x and monitoring stayed flat, you have a gap.

2. **Instrument AI-generated code the same as human code.** Do not assume AI handles logging and error reporting. It usually does not unless explicitly asked.

3. **Consolidate your observability tools.** Tool sprawl is the enemy of fast incident response. If checking on a service requires logging into four different dashboards, you will miss things.

4. **Set up deployment tracking.** Correlate every deploy with your metrics. Make "what changed?" a one-click answer, not a 30-minute investigation.

5. **Build a culture of observability.** This is not just an ops problem. If developers (or AI) are shipping code, they need to own how it behaves in production. That starts with visibility.

## The Bottom Line

The debate about AI-generated code is focused on the wrong end of the pipeline. Yes, verification matters. Yes, testing matters. But production is where your users live, and production does not care whether a human or an AI wrote the code that just crashed.

The companies that thrive in the AI-accelerated era will not be the ones that write code the fastest. They will be the ones that see problems the fastest.

Ship fast. Watch closer.
