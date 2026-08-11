# Why Can Woodpecker Clone the Repository but Not Its Private Git Submodules?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, Git, Submodules, CI/CD, Authentication

Description: Fix Woodpecker private submodule clones by aligning URLs, forge permissions, clone-plugin settings, and credential hosts.

---

When Woodpecker authenticates the parent clone, its default clone plugin receives forge credentials through a protected netrc mechanism. Public repositories are cloned without authentication by default; if a public parent needs a private same-forge submodule, an administrator must enable `WOODPECKER_AUTHENTICATE_PUBLIC_REPOS=true` or use a separate credential design. Injected credentials work for compatible HTTPS URLs on the correct forge host and only for repositories the authenticated identity may read. A private submodule can fail even when the parent clone succeeds because its URL uses SSH, points to another host, or names a repository outside that identity's permissions.

Current `woodpeckerci/plugin-git` enables recursive submodule cloning by default. The first task is therefore not blindly adding `recursive: true`; it is reading the failed submodule URL and deciding which credential should legitimately access it.

## Read the Clone Log Precisely

Find the first submodule error:

~~~text
Submodule 'shared' (git@git.example.com:platform/shared.git) registered
git@git.example.com: Permission denied (publickey).
~~~

or:

~~~text
fatal: could not read Username for 'https://git.other.example/platform/shared.git'
~~~

Record:

- URL scheme: SSH, HTTPS, or relative;
- hostname and port;
- submodule repository;
- pinned commit;
- whether the failure is authentication, authorization, TLS, DNS, or missing commit;
- whether the failure is in a nested submodule.

Do not replace every URL or broaden every token until those facts are known.

## Why HTTPS on the Same Forge Usually Works

When Woodpecker authenticates the parent clone, it injects those credentials into the trusted clone plugin. Its workflow documentation recommends HTTPS submodule URLs when the same credentials should clone the submodule:

~~~diff
 [submodule "shared"]
 path = vendor/shared
-url = git@git.example.com:platform/shared.git
+url = https://git.example.com/platform/shared.git
~~~

Commit the `.gitmodules` change:

~~~bash
git add .gitmodules
git commit -m "Use HTTPS for CI submodule clone"
~~~

This keeps credential handling inside the trusted clone step. It succeeds only if Woodpecker supplied credentials for the parent clone and that forge identity also has read access to `platform/shared`.

Relative HTTPS-compatible submodule URLs can also preserve the same forge host, but verify how Git resolves them after repository moves. An explicit canonical HTTPS URL is often easier to audit.

## Keep SSH for Developers with submodule_override

Developers may prefer an SSH URL locally. Woodpecker supports overriding the submodule URL only in the clone step:

~~~yaml
clone:
  git:
    image: woodpeckerci/plugin-git:2.9.2
    settings:
      recursive: true
      submodule_override:
        shared: https://git.example.com/platform/shared.git

steps:
  - name: test
    image: alpine:3.22
    commands:
      - test -e vendor/shared/.git
      - ./test.sh
~~~

The mapping key is the submodule name from `.gitmodules`, not necessarily its directory. Pin the clone plugin to a reviewed tag compatible with your Woodpecker release and confirm it against the official plugin releases.

An override is preferable to embedding a token in the URL. When the parent clone is authenticated, the default trusted clone mechanism supplies credentials without committing them to the repository.

## Confirm recursive and partial Settings

The current Git Clone plugin documents:

- `recursive: true` by default;
- `submodule_partial: true` by default;
- `submodule_update_remote: false` by default;
- `submodule_override` for URL replacement.

Set values explicitly when diagnosis requires a controlled test:

~~~yaml
clone:
  git:
    image: woodpeckerci/plugin-git:2.9.2
    settings:
      recursive: true
      submodule_partial: false
~~~

Despite its name, `submodule_partial` makes the plugin add `--depth=1 --recommend-shallow` to `git submodule update`; it is depth-one shallow cloning, not Git's `--filter`-based partial-clone feature. Disabling it stops the plugin from forcing depth one and may download more history, although `.gitmodules` can still recommend a shallow clone with `submodule.<name>.shallow=true`. Comparing the modes can help distinguish an authentication problem from a server that will not serve the pinned object through the shallow update path. Restore `submodule_partial` after diagnosis if the depth-one behavior is supported and beneficial.

Do not set `submodule_update_remote: true` to fix a missing pinned commit. That option asks Git to follow the submodule branch's remote tip rather than simply checking out the commit recorded by the parent, changing reproducibility.

## Check Forge Permissions

The user or application identity that activated the parent repository may read `app/api` but not `platform/shared`.

On the forge:

1. identify the Woodpecker OAuth user or application;
2. confirm it can view the submodule repository;
3. check organization/team membership;
4. check whether SSO authorization or application installation includes that repository;
5. check token scopes;
6. check whether the submodule was transferred or made private.

Test using a credential with the same scope from a safe environment:

~~~bash
git ls-remote https://git.example.com/platform/shared.git
~~~

An interactive browser session proves only your personal account has access. It does not prove Woodpecker's forge token does.

Grant read access to the specific dependency instead of organization-wide administration. If the submodule contains source that fork pull requests must not see, do not make it available through a PR clone path.

## Different Hosts Need Different Credentials

netrc credentials are selected by machine. A token for `git.example.com` is not automatically sent to `code.example.net`, which is the right behavior.

For a cross-forge private submodule, choose an explicit design:

- mirror the dependency into the same forge with controlled synchronization;
- package it and consume an immutable release instead of a Git submodule;
- use a dedicated read-only deploy credential in a manual submodule step;
- use a custom trusted clone plugin that safely supports both credential sources.

Do not add a second host's token to a parent repository URL or global environment variable.

If using a manual step, disable recursive work in the default clone and inject the dedicated credential only into that step:

~~~yaml
clone:
  git:
    image: woodpeckerci/plugin-git:2.9.2
    settings:
      recursive: false

steps:
  - name: private-submodules
    image: alpine/git:2.49.1
    environment:
      SUBMODULE_TOKEN:
        from_secret: cross_forge_submodule_token
    commands:
      - ./scripts/checkout-private-submodules.sh
~~~

The checked-in script should use a temporary credential helper, disable command tracing, populate `known_hosts` for SSH if applicable, run `git submodule sync --recursive` and `git submodule update --init --recursive`, then remove the helper. Do not place the token in a command-line URL, `.git/config`, artifact, or log.

Restrict the secret to trusted events. A pull request can change the checkout script and exfiltrate it.

## Trusted Clone Plugins Protect netrc

For repositories that are not marked Trusted, Git credentials are intentionally injected only into clone images allowlisted through the server's `WOODPECKER_PLUGINS_TRUSTED_CLONE` setting or the repository's custom trusted clone-plugin setting. Overriding the clone image in a workflow with an unlisted custom plugin can make a private parent or submodule suddenly lose credentials.

Administrators should allow exact image tags where possible:

~~~ini
WOODPECKER_PLUGINS_TRUSTED_CLONE=docker.io/woodpeckerci/plugin-git:2.9.2
~~~

Do not solve an allowlist mismatch by trusting a floating or contributor-controlled image. A clone plugin receives credentials capable of reading source and possibly using the forge API.

## Synchronize URL Changes

Git caches submodule URLs in `.git/config`. After changing `.gitmodules`, a persistent local checkout may still use the old URL until:

~~~bash
git submodule sync --recursive
git submodule update --init --recursive
~~~

Woodpecker normally creates a fresh workspace, so it should read the committed `.gitmodules`. A persistent local reproduction or custom cached clone may need `sync`.

Inspect the exact event revision:

~~~bash
git show HEAD:.gitmodules
git ls-tree HEAD vendor/shared
~~~

The tree entry records the pinned submodule commit. Confirm that commit still exists and is reachable on the remote. Authentication can succeed while checkout fails because history was rewritten or the object was removed.

## TLS, DNS, and Proxy Errors

Once credentials are correct, use a diagnostic image with the required tools on the same network path as the clone step to test direct DNS and TLS connectivity to every submodule host:

~~~bash
getent hosts git.example.com
openssl s_client -connect git.example.com:443 -servername git.example.com </dev/null
~~~

The `openssl s_client` command tests a direct connection. If the clone uses an HTTP proxy, test with Git or curl under the same proxy environment instead.

For a private CA, use the clone plugin's documented `custom_ssl_path` or `custom_ssl_url` setting. On the Docker backend, another supported option is mounting the host CA bundle into pipeline containers through `WOODPECKER_BACKEND_DOCKER_VOLUMES`. Avoid permanent `skip_verify: true`; it exposes source credentials to interception.

An HTTP redirect can also change the credential host. The canonical submodule URL should point directly to the authenticated Git endpoint. Check reverse-proxy logs for stripped `Authorization` headers or redirects to a login page.

## Nested Submodules and Git LFS

`recursive` follows nested submodules, so every nested URL and permission must satisfy the same rules. The following commands show top-level declarations and initialized submodule remotes. They print configured URLs verbatim, so run them only in a safe shell and redact embedded credentials before sharing the output:

~~~bash
git config get --file .gitmodules --all --show-names --regexp 'submodule\..*\.url'
git submodule foreach --recursive 'git remote -v'
~~~

Git LFS is a separate transfer mechanism. The current clone plugin enables LFS for the parent repository by default, but its LFS fetch and checkout do not recurse into independent submodule repositories. Fetch LFS objects explicitly inside each submodule that uses them, with credentials authorized for that submodule's LFS endpoint. An LFS `401` requires LFS endpoint authorization, not another `submodule_override` alone.

## A Safe Diagnostic Sequence

1. Copy the first failing submodule URL from the clone log.
2. Compare scheme and host with the parent clone URL.
3. For same-forge credentials, confirm Woodpecker authenticated the parent clone, then use HTTPS or `submodule_override`.
4. Confirm the Woodpecker forge identity can read the submodule.
5. Confirm the clone step is eligible to receive netrc: an allowlisted image or a Trusted repository.
6. Retry with recursive explicit and partial disabled.
7. Verify the pinned commit exists.
8. Test DNS, TLS, and proxy routing from the clone network.
9. For another host, issue a dedicated read-only credential and keep it out of PRs.
10. Rotate any token ever printed or embedded in a URL.

## Official Documentation

- [Woodpecker: Clone syntax and Git submodules](https://woodpecker-ci.org/docs/usage/workflow-syntax#git-submodules)
- [Woodpecker: Git Clone plugin settings](https://woodpecker-ci.org/plugins/git-clone)
- [Woodpecker: Custom trusted clone plugins](https://woodpecker-ci.org/docs/usage/project-settings#custom-trusted-clone-plugins)
- [Woodpecker: Server trusted-clone allowlist](https://woodpecker-ci.org/docs/administration/configuration/server#plugins_trusted_clone)
- [Woodpecker: Clone troubleshooting](https://woodpecker-ci.org/docs/usage/troubleshooting#how-to-debug-clone-issues)
- [Git: gitmodules documentation](https://git-scm.com/docs/gitmodules)
- [Git: git submodule documentation](https://git-scm.com/docs/git-submodule)

## Conclusion

A successful parent clone proves only that the parent was reachable and, when authentication was used, that those credentials could read that repository. When the same forge credentials are available, make submodules use compatible HTTPS URLs or a credential-free `submodule_override`, and confirm the forge identity can read every dependency. For another host, use a dedicated read-only credential in a tightly controlled step or replace the submodule with a packaged dependency. Never embed tokens in `.gitmodules`, URLs, or logs.
