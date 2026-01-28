# How to Configure CircleCI Self-Hosted Runners

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CircleCI, Self-Hosted Runners, CI/CD, DevOps, Automation

Description: Learn how to set up CircleCI self-hosted runners for faster builds, custom environments, and lower CI costs.

---

CircleCI self-hosted runners let you run jobs on your own infrastructure. This is useful for special dependencies, compliance, or cost control. This guide shows the setup flow and best practices.

## Step 1: Create a Resource Class

In CircleCI, create a runner resource class and associate it with your organization or project.

## Step 2: Install the Runner

Download and install the CircleCI runner agent on your host. The agent connects back to CircleCI and waits for jobs.

## Step 3: Register the Runner

Use the token provided by CircleCI to register the runner with your resource class.

## Step 4: Use the Runner in a Job

```yaml
version: 2.1

jobs:
  build:
    machine:
      resource_class: my-org/my-runner
    steps:
      - checkout
      - run: make build

workflows:
  build:
    jobs:
      - build
```

## Security Tips

- Run runners on isolated hosts
- Rotate runner tokens regularly
- Restrict outbound network access if needed

## Best Practices

- Use autoscaling if your workload spikes
- Keep base images and OS up to date
- Monitor runner health and queue depth

## Conclusion

Self-hosted runners give you full control and flexibility. Start small with one runner, then scale as your CI demand grows.
