# Why Are Woodpecker Secrets Missing on Pull Requests and Forks?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, Secrets, Pull Requests, Security

Description: Diagnose missing Woodpecker secrets on pull requests and preserve the default security boundary for untrusted code and forks.

---

Woodpecker does not expose stored secrets to `pull_request` events by default. That is a security boundary, not a flaky variable injection. A pull request can change the workflow and every script it executes; if a long-lived production token were available, an author could send it to an external server or encode it in logs.

Forks make the risk obvious, but the same concern applies to an untrusted branch in the main repository. The safe fix is usually to redesign the workflow so pull requests validate without secrets and privileged work runs only after merge. Enabling `pull_request` for a secret should be a deliberate, narrowly scoped exception.

## Identify Which Credential Is Missing

Several credentials participate in a Woodpecker run, and they are not interchangeable:

- **Forge clone credentials** are supplied to the trusted clone plugin so it can fetch the repository.
- **Woodpecker secrets** are named values injected into selected steps with `from_secret`.
- **Registry pull credentials** are used by the agent or backend to pull a private step image and are not exposed inside the step.
- **Plugin settings credentials** are Woodpecker secrets mapped into a plugin's `settings`.

A repository may clone successfully and pull a private image while an application token is absent. That does not contradict the secret policy; each credential has a separate scope.

Check the failed step and variable name before changing repository settings.

## Use Current 3.x Secret Syntax

Woodpecker 3.x removed the old step-level `secrets:` key. Inject a stored secret through an environment map:

~~~yaml
steps:
  - name: publish
    image: example.com/acme/publisher:2
    environment:
      PUBLISH_TOKEN:
        from_secret: artifact_publish_token
    commands:
      - test -n "$PUBLISH_TOKEN"
      - ./publish.sh
~~~

The environment variable can have a different name from the stored secret. Secret names are case-sensitive as defined; 3.x no longer automatically sanitizes them to uppercase.

For plugin settings:

~~~yaml
steps:
  - name: publish-image
    image: woodpeckerci/plugin-docker-buildx
    settings:
      repo: registry.example.com/acme/api
      username:
        from_secret: registry_username
      password:
        from_secret: registry_password
~~~

If brace-style shell expansion is used, escape it as documented so Woodpecker's preprocessing does not consume it before the container shell:

~~~yaml
commands:
  - test -n "$${PUBLISH_TOKEN}"
~~~

Never print the value. Secret masking is a last defense, not authorization, and transformed values may evade masking.

## Confirm the Pipeline Event

Open pipeline details and check `CI_PIPELINE_EVENT`. A branch pushed directly has event `push`; a pull request update has event `pull_request`. A single commit can generate both in a same-repository pull request, and the push run may receive a default secret while the PR run does not.

That asymmetry is expected. The official secret documentation states that a newly created secret is normally available to `push`, `tag`, and `deployment`, not `pull_request`.

Do not diagnose only by commit SHA. Compare event, repository, workflow, step image, and secret name.

## Check the Secret's Event Filter

Repository, organization, and global secrets can be restricted by event. In the UI, open the secret and inspect its allowed events. The CLI can also create a secret with explicit events:

~~~bash
woodpecker-cli repo secret add +  --repository octocat/hello-world +  --name readonly_test_token +  --value @/secure/path/token +  --event pull_request +  --event push
~~~

Adding `pull_request` means any eligible pull-request workflow can request the secret. It is not limited to the step as it existed before the pull request; the proposed YAML is code and can be changed by the contributor.

Before enabling it, answer:

- Can the credential write, delete, deploy, or spend money?
- Can it access private source or customer data?
- Is the repository public?
- Can outside contributors open pull requests?
- Can the token be replaced with a read-only, resource-limited, short-lived credential?
- Can the operation run after merge instead?

If any answer implies material impact, keep the secret out of PR events.

## Check Plugin Image Filters

Woodpecker can restrict a secret to specified plugin images. This reduces the chance that a secret intended for a known publisher is used by another plugin. Tags matter, and the documentation warns that overlapping broad and tagged entries can result in the least restrictive entry taking precedence.

Confirm that:

- the step is actually a plugin step;
- the configured image and tag match the allowed entry;
- an untagged allow entry is not unintentionally broad;
- the plugin image is pinned to a reviewed version or digest;
- the secret was not expected in a normal command step when its policy is plugin-specific.

Image filtering complements event filtering. It does not make it safe to give a powerful secret to arbitrary pull-request code, because a contributor may be able to invoke the allowed plugin with attacker-controlled settings.

## Fork Approval Is a Separate Control

Woodpecker's project setting **Require approval for** can put selected pipelines on hold. The Woodpecker 3.0 migration made approval for forked repositories the restrictive default.

Approval answers, “May this proposed pipeline execute?” Secret event configuration answers, “May this event receive this secret?” They are independent controls. Approving a fork pipeline does not automatically add `pull_request` to a secret that excludes it. Conversely, enabling the event does not turn a powerful token into a safe one.

Review the exact commit and workflow before approving untrusted code. If a contributor can update the pull request after review, make sure a new revision requires a fresh trusted decision under your repository policy.

## Prefer a Two-Phase Workflow

Run untrusted validation without secrets:

~~~yaml
when:
  event: pull_request

steps:
  - name: lint
    image: node:24-alpine
    commands:
      - npm ci
      - npm run lint

  - name: test
    image: node:24-alpine
    commands:
      - npm test
~~~

Run privileged publication only after the reviewed code reaches `main`:

~~~yaml
when:
  event: push
  branch: main

steps:
  - name: publish
    image: example.com/acme/publisher:2
    environment:
      PUBLISH_TOKEN:
        from_secret: artifact_publish_token
    commands:
      - ./publish.sh
~~~

Protect `main` in the forge, require reviews and successful PR checks, and restrict the publish secret to the push event. This makes the trusted action run from the repository's merged configuration, not from the fork's proposed workflow.

## Redesign Tests That Seem to Require Secrets

Many tests need a service, not a production credential. Safer substitutes include:

- a service container started inside the workflow;
- a disposable local database;
- recorded fixtures;
- a fake server;
- a token scoped only to a dedicated test tenant with no sensitive data;
- a public read-only endpoint;
- a post-merge integration suite.

Do not copy production data into the “test” account. A narrowly scoped token is useful only if its resources and permissions are genuinely isolated.

If tests need access to a private dependency, consider whether the agent's private registry pull mechanism or trusted clone mechanism can retrieve it without exposing reusable credentials to the step. Pull credentials are not available inside build containers by design.

## Other Causes After Event Policy Is Correct

If the secret should be available for this trusted event, check:

1. **Name and case**: `artifact_publish_token` is not `ARTIFACT_PUBLISH_TOKEN`.
2. **Level and precedence**: Woodpecker supports repository, organization, and global secrets; the documented priority is last-wins in that order, so inspect identically named values.
3. **Step mapping**: the environment or setting must use `from_secret`.
4. **Event selection**: `manual`, `cron`, and `deployment` are distinct from `push`.
5. **Plugin filter**: image and tag must be eligible.
6. **Workflow revision**: the pipeline uses YAML from the event's commit.
7. **3.x migration**: remove legacy `secrets:` syntax and preserve exact case.

Add a non-disclosing check:

~~~sh
if [ -z "$PUBLISH_TOKEN" ]; then
  echo "PUBLISH_TOKEN is unavailable for this event and step" >&2
  exit 1
fi
~~~

Do not run `env`, enable shell tracing, or include the token in an error message.

## An Exception Process for PR Secrets

When a pull-request secret is unavoidable:

1. Create a new credential rather than reusing production.
2. Grant read-only access to the smallest dedicated resource.
3. Set a short expiration and rotation owner.
4. Restrict the secret to `pull_request` and only necessary plugin images.
5. Keep fork approvals enabled.
6. Pin the allowed plugin image.
7. Test exfiltration scenarios in a private repository.
8. Monitor use and revoke immediately after the need ends.

Document why post-merge execution or a local substitute was insufficient.

## Official Documentation

- [Woodpecker: Secrets and pull-request event filters](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker: Project approval and trusted settings](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker: Workflow events](https://woodpecker-ci.org/docs/usage/workflow-syntax#event)
- [Woodpecker: Private registry credentials](https://woodpecker-ci.org/docs/usage/registries)
- [Woodpecker: CLI secret commands](https://woodpecker-ci.org/docs/cli)
- [Woodpecker: 3.0 secret and approval migrations](https://woodpecker-ci.org/migrations#300)

## Conclusion

Missing PR secrets are normally Woodpecker enforcing the correct default. Verify that the value is a Woodpecker secret, inspect the actual pipeline event and image restrictions, and use current `from_secret` syntax. Prefer secret-free PR validation followed by a protected-branch publish. If an exception is essential, issue a dedicated, short-lived, read-only credential and retain fork approval as an additional—not replacement—control.
