# Validation Summary: How to Autoscale Buildkite Agents Without Long Queue Waits

## Status
validated

## Post Type
Technical guide with an illustrative YAML configuration snippet.

## Technologies Covered
- Buildkite self-hosted agents and queue targeting
- Buildkite Elastic CI Stack for AWS
- Amazon EC2, Auto Scaling groups, and CloudFormation parameters
- Agent AMIs, bootstrap configuration, and CI dependency caches
- Autoscaling capacity planning and queue-delay measurement

## Sources Consulted
- [Elastic CI Stack configuration parameters](https://buildkite.com/docs/agent/self-hosted/aws/elastic-ci-stack/ec2-linux-and-windows/configuration-parameters): parameter names, numeric values, cooldown units, idle termination, and scale-in protection.
- [Elastic CI Stack architecture](https://buildkite.com/docs/agent/self-hosted/aws/elastic-ci-stack/architecture): provisioning, bootstrap, demand-based scaling, scheduled capacity, and termination lifecycle.
- [Buildkite queues](https://buildkite.com/docs/agent/queues): queue assignment and available agents.
- [Buildkite agent configuration](https://buildkite.com/docs/agent/self-hosted/configure): authentication and agent tags.
- [Command step](https://buildkite.com/docs/pipelines/configure/step-types/command-step): agent targeting requirements.
- [Agent lifecycle](https://buildkite.com/docs/agent/lifecycle): job acquisition and graceful shutdown.
- [Creating custom AMIs](https://buildkite.com/docs/agent/self-hosted/aws/elastic-ci-stack/ec2-linux-and-windows/creating-custom-amis): preparing agent images.
- [Queue metrics](https://buildkite.com/docs/pipelines/insights/queue-metrics): queued work and capacity observations.
- [AWS EC2 Auto Scaling launch failure troubleshooting](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ts-as-instancelaunchfailure.html): instance availability and subnet capacity failures.
- [Author profile](https://github.com/nawazdhandala): verified the author link redirects to the intended profile.

## Issues Found
- The burst-sizing statement implied that warm capacity must cover the entire initial burst simultaneously whenever startup exceeds the queue-delay target. Existing agents can finish short jobs and accept subsequent jobs within that target. Revised the sentence to require enough existing capacity to start the burst within the target while accounting for agent reuse. This is a capacity-planning correction based on the documented job lifecycle; it does not change the illustrative configuration.

## Review Notes
- Parsed the YAML snippet successfully with PyYAML and checked all seven parameter names and values against the official parameter reference. The cooldown and idle-period values are seconds. The snippet is correctly labeled as illustrative parameter values rather than a deployable CloudFormation template.
- Confirmed the distinction between a minimum fleet size and an idle buffer, and the documented instance-wide idle behavior when multiple agents run on a host.
- Reviewed startup latency, resource contention, queue routing, launch failures, graceful termination, and controlled-burst measurement guidance. No other technical corrections were needed.
- The post specifies no stack release. Its instruction to check the installed release remains appropriate because lifecycle behavior and available parameters can vary by release and scaling mode.
- The three-minute startup and six-job burst are hypothetical examples, not performance guarantees. New capacity also depends on scaler response and successful provisioning; jobs may instead start on agents that become free sooner.
- All external links in the post resolve to the intended resources. There are no terminal commands or executable application examples to test.
- Validation was based on documentation and local YAML parsing. No AWS resources were provisioned and no live Buildkite burst tests were run.
