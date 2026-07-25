# Devfile Starters: Branches, Revisions, Private Git, and Multiple Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, Git, odo, Developer Environments, Platform Engineering

Description: Design reproducible Devfile starter projects with valid remotes, pinned revisions, monorepo subdirectories, and consumer-managed private Git access.

---

A Devfile starter project is the source code offered when someone bootstraps a new application from a stack. It is not the same thing as every repository needed by an existing development environment. That distinction matters as soon as a stack offers several examples, tracks a release branch, reads from private Git, or supports a monorepo.

Devfile 2.3 gives starter authors a small, precise model:

- Each starter has a unique `name`.
- Its source is either `git` or `zip`.
- A Git starter has a `remotes` map, but validation permits at most one remote in each starter entry.
- `checkoutFrom` can identify a remote and a revision.
- `subDir` can make a directory inside the downloaded source the starter root.

The consumer, such as an IDE or CLI, performs the download. Authentication and the final workspace layout therefore also depend on that consumer.

## Start with a valid Git starter

This example deliberately spells out every Git choice:

```yaml
schemaVersion: 2.3.0
metadata:
  name: node-service
  version: 1.4.0

starterProjects:
  - name: node-service-main
    description: Minimal API from the main branch
    git:
      remotes:
        origin: https://git.example.com/platform/node-service.git
      checkoutFrom:
        remote: origin
        revision: main
    subDir: examples/minimal-api
```

The nesting is significant:

- `remotes` and `checkoutFrom` belong under `git`.
- `subDir` belongs to the starter project entry, alongside `git`.
- `remote: origin` names a key in the `remotes` map; it is not another URL.
- `revision` can identify a branch, tag, or commit.

Because a starter may have only one remote, `checkoutFrom.remote` is usually redundant. It is still useful for making the relationship explicit. If it is present, Devfile validation requires the name to exist in the configured map.

## One starter entry means one Git remote

A normal Git checkout can have `origin`, `upstream`, and other remotes. A Devfile 2.3 starter project cannot model that arrangement in one entry:

```yaml
# Invalid as a Devfile starter project
starterProjects:
  - name: api
    git:
      remotes:
        origin: https://git.example.com/team/api.git
        upstream: https://git.example.com/platform/api.git
      checkoutFrom:
        remote: origin
        revision: main
```

The 2.3 validation rules reject a starter entry with more than one remote. Removing `checkoutFrom.remote` does not make the example valid; the problem is the number of remote keys.

Use the canonical clone URL as the starter's single remote. If developers need an `upstream` remote later, add it in repository-specific onboarding or automation after bootstrap. Do not hide a second URL in an attribute and assume every Devfile consumer will understand it. Attributes are implementation-dependent.

## Choose a revision with reproducibility in mind

The schema describes `revision` as a branch name, tag, or commit ID. Each choice has a different operational meaning:

- A branch such as `main` gives new users the newest source on that branch.
- A release branch such as `release-2.x` moves, but within an intended maintenance line.
- A tag such as `v2.4.1` usually identifies a release, subject to the Git server's tag controls.
- A full commit ID gives the strongest pin because it identifies exact repository content.

For a versioned Devfile stack, pinning a tag or commit prevents a starter from changing underneath an unchanged stack version. If the goal is explicitly to demonstrate current development, a branch is reasonable, but document that it moves.

Devfile's schema text says the default branch is used when `revision` is missing or the specified revision is not found. That fallback is convenient for interactive use but weak for reproducibility. Test every revision during registry publication so a misspelled release tag does not silently produce different source than intended.

A useful release convention is:

```yaml
metadata:
  name: node-service
  version: 1.4.0

starterProjects:
  - name: node-service-1-4
    git:
      remotes:
        origin: https://git.example.com/platform/node-service.git
      checkoutFrom:
        revision: 7f3bff8fda84a857d3c7c8876c595aa86b970b30
```

Keep the human-readable release relationship in the starter name and description, while using the immutable commit as the actual checkout target.

## Use `subDir` for one starter inside a monorepo

`subDir` selects a relative directory from the downloaded starter source as the starter root. It is useful when one repository contains several independent examples:

```text
examples/
├── minimal-api/
├── worker/
└── web-client/
```

The stack can offer each example as a separate choice, even though every choice downloads the same repository:

```yaml
starterProjects:
  - name: minimal-api
    git:
      remotes:
        origin: https://git.example.com/platform/examples.git
      checkoutFrom:
        revision: v3.2.0
    subDir: examples/minimal-api

  - name: background-worker
    git:
      remotes:
        origin: https://git.example.com/platform/examples.git
      checkoutFrom:
        revision: v3.2.0
    subDir: examples/worker
```

Keep `subDir` relative to the source location. Do not use it as a destination path, and do not treat it as a way to combine two repositories. It narrows one downloaded source tree to one starting directory.

Also test what happens to repository metadata with your chosen consumer. The Devfile describes which subdirectory is the starter root; it does not promise that every consumer copies or retains the surrounding Git checkout in exactly the same way.

## Multiple starters are alternatives, not a repository set

This Devfile offers two valid starting points:

```yaml
starterProjects:
  - name: express-api
    git:
      remotes:
        origin: https://git.example.com/samples/express-api.git

  - name: fastify-api
    git:
      remotes:
        origin: https://git.example.com/samples/fastify-api.git
```

The entries mean "choose Express or Fastify." They do not mean "clone both repositories." Starter projects are intended for interactive bootstrap, and a user selects one.

For a development environment that genuinely works on several repositories, model the workspace sources as projects instead:

```yaml
schemaVersion: 2.3.0
metadata:
  name: storefront-workspace

projects:
  - name: storefront-api
    clonePath: services/api
    git:
      remotes:
        origin: https://git.example.com/storefront/api.git
      checkoutFrom:
        revision: main

  - name: storefront-web
    clonePath: services/web
    git:
      remotes:
        origin: https://git.example.com/storefront/web.git
      checkoutFrom:
        revision: main
```

`projects` describes projects worked on in the environment, and Devfile 2.3 also defines `dependentProjects` for additional related sources. Consumer support still matters, so verify that the tool materializes those fields as expected. The key modeling rule is stable: repeated `starterProjects` entries are choices; repeated project entries describe multiple workspace sources.

## Keep private Git credentials outside the Devfile

The Git source schema provides remote URLs and checkout information. It does not provide portable username, password, token, SSH private-key, or credential-secret fields. That is a useful security boundary.

Never write a token into a remote URL:

```yaml
# Do not publish credentials in a Devfile
remotes:
  origin: https://user:token@git.example.com/team/private-starter.git
```

Devfiles are commonly stored in source control, packaged into registries, cached, and displayed by tools. An embedded credential can leak through every one of those paths.

Instead:

1. Use a normal HTTPS or SSH clone URL.
2. Configure authentication through the Devfile consumer and Git provider.
3. Give the credential read-only access to the required repository.
4. Prefer short-lived or centrally rotated credentials where the consumer supports them.
5. Test bootstrap from a clean environment, not only from a workstation with broad cached access.

Authentication is consumer-specific. A desktop IDE, hosted workspace service, and CLI can obtain credentials in different ways. The Devfile remains portable by describing the source rather than the secret. Consult the selected consumer's current credential documentation instead of assuming that a local credential helper, SSH agent, or cluster Secret is automatically used.

`git ls-remote <url>` is a useful check that the URL and the repository's advertised refs are visible from a particular shell, but it does not prove a different consumer has the same credential context.

## Select a starter with archived odo v3

In an empty directory, odo v3's interactive `odo init` flow asks the user to select a Devfile and then one of its starter projects. For automation, the archived command accepts the starter name:

```bash
odo init \
  --name payments-api \
  --devfile nodejs \
  --devfile-version 2.1.1 \
  --starter nodejs-starter
```

The `--starter` value must match the starter project's `name`, not its remote name or repository name. `odo init` is intended to run before a local `devfile.yaml` exists. When source already exists, odo follows its source-detection flow and does not need to download a starter.

Because odo has reached end of life, treat this command as documentation for maintained legacy environments. New platform workflows should use a supported Devfile consumer.

## A publication checklist

Before publishing a stack with starters, verify:

- Every starter name is unique and follows the Devfile identifier rules.
- Every Git starter has exactly one remote.
- Every `checkoutFrom.remote`, when present, matches that one remote key.
- Every branch, tag, or commit exists and is accessible.
- Moving branches are intentional; stable stack releases use a stable revision.
- Every `subDir` is relative and exists at the selected revision.
- Multiple starter entries represent honest alternatives.
- Multi-repository workspaces use project fields rather than pretending all starters are selected.
- Private repositories can be read by the intended consumer without credentials in YAML.
- Interactive and non-interactive bootstrap both select the intended starter.

Most starter failures come from mixing three separate concerns: which example a user chooses, which Git content that choice resolves to, and how the consuming tool authenticates. Keep those concerns explicit and a starter remains predictable across branches, releases, monorepos, and private infrastructure.

## Official Documentation

- [Devfile 2.3: Defining starter projects](https://devfile.io/docs/2.3.0/defining-starter-projects)
- [Devfile 2.3 validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.3 schema](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3: Adding projects](https://devfile.io/docs/2.3.0/adding-projects)
- [odo v3 `odo init` command reference](https://odo.dev/docs/command-reference/init/)
- [Red Hat's odo deprecation and end-of-life notice](https://developers.redhat.com/products/odo)
