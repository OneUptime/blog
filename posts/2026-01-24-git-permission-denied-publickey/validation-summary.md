# Validation Summary: How to Fix 'Permission Denied (publickey)' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Git
- SSH and OpenSSH
- ssh-agent and ssh-add
- ssh-keygen
- SSH client configuration
- GitHub SSH authentication
- GitLab SSH authentication
- Bitbucket Cloud SSH authentication
- Windows OpenSSH
- WSL
- Deploy keys

## Sources Consulted
- RFC 4252: The Secure Shell (SSH) Authentication Protocol - https://datatracker.ietf.org/doc/html/rfc4252
- OpenBSD ssh_config manual - https://man.openbsd.org/ssh_config
- Git remote documentation - https://git-scm.com/docs/git-remote
- GitHub Docs: Generating a new SSH key and adding it to the ssh-agent - https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent
- GitHub Docs: Adding a new SSH key to your GitHub account - https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account
- GitHub Docs: Testing your SSH connection - https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection
- GitHub Docs: Using SSH over the HTTPS port - https://docs.github.com/en/authentication/troubleshooting-ssh/using-ssh-over-the-https-port
- GitHub Docs: Managing deploy keys - https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- GitHub Docs: Managing remote repositories - https://docs.github.com/en/get-started/git-basics/managing-remote-repositories
- GitLab Docs: Use SSH keys with GitLab - https://docs.gitlab.com/user/ssh/
- Atlassian Support: Set up personal SSH keys on Linux for Bitbucket Cloud - https://support.atlassian.com/bitbucket-cloud/docs/set-up-personal-ssh-keys-on-linux/
- Atlassian Support: Change the remote URL to your repository - https://support.atlassian.com/bitbucket-cloud/docs/change-the-remote-url-to-your-repository/
- Local command checks: `ssh -V`, `git --version`, and OpenSSH/Git command behavior.

## Issues Found
- The SSH authentication diagram described the server sending a public key plus challenge and the client signing the challenge. RFC 4252 public-key authentication uses a client signature over the authentication request data, including the session identifier, and the server verifies that signature with an acceptable public key. Updated the diagram to describe offering the public key, signing the authentication request, and verifying the signature.
- The GitLab navigation path for adding SSH keys used the older "Preferences > SSH Keys" wording. Current GitLab documentation directs users through Edit profile > Access > SSH keys and then Add new key. Updated the steps while preserving the original structure.

## Review Notes
- The GitHub, GitLab, and Bitbucket SSH test commands are correct. Their success messages differ by provider; the post's sample success response is specifically GitHub's wording.
- The macOS `UseKeychain` option is Apple-specific. The post correctly scopes it to macOS, but future revisions could mention `IgnoreUnknown UseKeychain` for configs shared across non-Apple OpenSSH clients.
- GitHub deploy keys are repository-specific and read-only by default, with optional write access. The post's deploy-key guidance is accurate for the level of detail presented.
