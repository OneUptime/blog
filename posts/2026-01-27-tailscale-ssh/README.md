# Tailscale SSH: Set Up Secure Remote Access Without Managing Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tailscale, SSH, Security, Networking, Zero Trust, DevOps

Description: Replace SSH key management with Tailscale SSH. Step-by-step setup for secure, zero-config remote access to your machines over a WireGuard mesh network.

---

> "The best SSH key is the one you never have to manage. Tailscale SSH removes the key distribution problem entirely by tying access to identity, not files."

---

## What is Tailscale SSH?

Tailscale SSH lets you SSH into devices on your tailnet without managing SSH keys. Instead of distributing public keys and maintaining authorized_keys files across your fleet, Tailscale authenticates users through your identity provider and authorizes access through centralized ACLs.

The benefits are immediate:

- **No more key rotation headaches.** Access is tied to identity, not static files.
- **Centralized access control.** One ACL policy governs who can reach what.
- **Session recording.** Every command is logged for compliance and forensics.
- **Check mode.** Require step-up re-authentication for high-risk SSH sessions.

This guide walks through enabling Tailscale SSH, configuring ACLs, setting up session recording, and integrating with VS Code Remote SSH.

---

## Enabling Tailscale SSH on your servers

Before you can use Tailscale SSH, you need to enable it on each target machine. This tells the Tailscale daemon to accept SSH connections and handle authentication.

On Linux servers, run:

```bash
# Enable Tailscale SSH on this machine

sudo tailscale up --ssh
```

For machines already running Tailscale, you can enable SSH without disrupting the existing connection:

```bash
# Add SSH capability to an existing Tailscale session
sudo tailscale set --ssh
```

Verify that SSH is enabled:

```bash
# Check current Tailscale status
tailscale status
```

The output should show your machine accepting SSH connections. The Tailscale daemon now listens on port 22 (or a configured alternative) and handles authentication through your tailnet identity.

---

## Configuring ACLs for SSH access

Tailscale SSH access is governed by your tailnet's ACL policy. Without explicit rules, no one can SSH into your machines - this is secure by default.

Navigate to the Tailscale admin console and open the Access Controls page. Here is a basic ACL configuration that grants SSH access to specific groups:

```json
{
  // Define groups for role-based access control
  // Groups make it easy to manage access as team members change
  "groups": {
    "group:engineers": ["user1@example.com", "user2@example.com"],
    "group:sre": ["oncall@example.com", "sre-lead@example.com"],
    "group:readonly": ["auditor@example.com"]
  },

  // Tag owners control which users can assign tags to devices
  // Tags are used to identify server roles (web, db, etc.)
  "tagOwners": {
    "tag:server": ["group:sre"],
    "tag:production": ["group:sre"],
    "tag:staging": ["group:engineers"]
  },

  // Main ACL rules - these control network access
  "acls": [
    // SRE team gets full access to all servers
    {
      "action": "accept",
      "src": ["group:sre"],
      "dst": ["tag:server:*"]
    },
    // Engineers can access staging but not production
    {
      "action": "accept",
      "src": ["group:engineers"],
      "dst": ["tag:staging:*"]
    }
  ]
}
```

This configuration establishes the network-level access. But Tailscale SSH has its own dedicated section for finer control.

---

## SSH access rules

The `ssh` section in your ACL policy defines who can SSH into which machines and with what privileges. This is where Tailscale SSH really shines - you can specify the exact username, require periodic re-authentication, and enable session recording per rule.

```json
{
  "groups": {
    "group:engineers": ["user1@example.com", "user2@example.com"],
    "group:sre": ["oncall@example.com", "sre-lead@example.com"],
    "group:readonly": ["auditor@example.com"]
  },

  "tagOwners": {
    "tag:server": ["group:sre"],
    "tag:production": ["group:sre"],
    "tag:staging": ["group:engineers"],
    "tag:recorder": ["group:sre"]
  },

  // SSH-specific access rules
  // These rules control Tailscale SSH behavior independently of network ACLs
  "ssh": [
    // SRE team gets root access to production with session recording
    // The recorder field references the tag attached to tsrecorder nodes
    {
      "action": "accept",
      "src": ["group:sre"],
      "dst": ["tag:production"],
      "users": ["root", "deploy"],
      "recorder": ["tag:recorder"]
    },

    // Engineers can SSH to staging as any non-root local user
    // autogroup:nonroot allows any username on the host except root
    {
      "action": "accept",
      "src": ["group:engineers"],
      "dst": ["tag:staging"],
      "users": ["autogroup:nonroot"]
    },

    // High-risk root access requires re-authentication via the IdP
    // checkPeriod sets how long a successful check lasts before re-auth
    {
      "action": "check",
      "src": ["group:sre"],
      "dst": ["tag:production"],
      "users": ["root"],
      "checkPeriod": "12h"
    }
  ]
}
```

Key fields in SSH rules:

- **action**: `accept` grants access immediately; `check` grants access only after the user re-authenticates through your identity provider
- **src**: Users or groups who can initiate SSH connections
- **dst**: Target machines identified by tags or hostnames (port `22` is implicit and cannot be customized)
- **users**: Linux usernames the source can SSH as
- **checkPeriod**: Required when `action` is `check`; how long a re-authentication is valid (1 minute to 168 hours, or `"always"` to require re-auth on every connection)
- **recorder**: Tags of tsrecorder nodes that will record the session

---

## Session recording for compliance

Session recording captures every keystroke and command output during an SSH session. This is invaluable for compliance audits, incident forensics, and training.

Tailscale records sessions to dedicated recorder nodes that run the `tsrecorder` service. You deploy `tsrecorder`, tag the recorder nodes (for example `tag:recorder`), and then reference that tag from your SSH rules. The `recorder` field takes a list of tags - it does not accept user email addresses.

To enable session recording, add the `recorder` field to your SSH rules:

```json
{
  "ssh": [
    {
      "action": "accept",
      "src": ["group:sre"],
      "dst": ["tag:production"],
      "users": ["root"],
      // Sessions are streamed to nodes carrying this tag
      // Those nodes run tsrecorder and persist the recording
      "recorder": ["tag:recorder"],
      // Deny the session if no recorder node is reachable
      "enforceRecorder": true
    }
  ]
}
```

Session recordings are stored on the recorder nodes you operate and can be viewed through the Tailscale admin console. Each recording includes:

- Full terminal output (what the user saw)
- Timing information (when each command was entered)
- Session metadata (who connected, when, from where)

Set `enforceRecorder` to `true` to refuse SSH sessions whenever a recorder is unreachable - useful for highly sensitive environments where an unrecorded session is unacceptable. Users will see a notification that their session is being recorded.

---

## Check mode for high-risk access

Check mode adds an interactive re-authentication step in front of an SSH session. The user must complete a fresh authentication flow with your identity provider before Tailscale opens the connection. This is useful for:

- Root or other high-privilege accounts
- Production environments where every elevated session should be intentional
- Meeting compliance requirements that mandate step-up authentication

Enable check mode by setting the action to `check` and providing a `checkPeriod`:

```json
{
  "ssh": [
    // SREs may SSH as root, but must re-auth at least every 4 hours
    {
      "action": "check",
      "src": ["group:sre"],
      "dst": ["tag:production"],
      "users": ["root"],
      "checkPeriod": "4h"
    }
  ]
}
```

When the user runs `ssh root@host`, Tailscale opens a browser-based re-authentication prompt. After they sign in, the connection proceeds and remains exempt from further checks for the duration of `checkPeriod` (1 minute up to 168 hours, or `"always"` to require re-auth on every connection). Once the period elapses, the next connection prompts for re-authentication again.

---

## VS Code Remote SSH integration

Tailscale SSH integrates seamlessly with VS Code Remote SSH. You can develop on remote servers without copying SSH keys or configuring jump hosts.

Because Tailscale SSH claims port `22` on the tailnet interface of any host where you ran `tailscale set --ssh`, the standard `ssh` client (and therefore VS Code's Remote - SSH extension) connects to it without any extra wiring. Just SSH to the MagicDNS name and Tailscale handles authentication for you.

You can optionally add entries to `~/.ssh/config` to make hostnames and usernames easy to manage:

```text
# Production web server via Tailscale
Host prod-web
    HostName prod-web.your-tailnet.ts.net
    User deploy

# Staging database server
Host staging-db
    HostName staging-db.your-tailnet.ts.net
    User developer
```

In VS Code:

1. Install the Remote - SSH extension
2. Open the Command Palette and select "Remote-SSH: Connect to Host"
3. Choose your Tailscale hostname (either a `Host` alias from your config or the full `*.ts.net` name)
4. VS Code connects through Tailscale with full IDE features

For a more integrated experience, Tailscale also publishes an official VS Code extension that exposes the machines on your tailnet directly in the editor's sidebar and connects to them over Tailscale SSH.

---

## Replacing traditional SSH with Tailscale SSH

Migrating from traditional SSH to Tailscale SSH is straightforward but should be done carefully to avoid locking yourself out.

**Step 1: Keep traditional SSH running initially**

Do not disable OpenSSH until Tailscale SSH is verified working. Keep your existing SSH keys as a fallback.

**Step 2: Enable Tailscale SSH on target machines**

```bash
sudo tailscale set --ssh
```

**Step 3: Configure ACLs for your team**

Start with a permissive policy and tighten it after testing:

```json
{
  "ssh": [
    // Initial migration - all authenticated users get access
    // Tighten this after verification
    {
      "action": "accept",
      "src": ["autogroup:member"],
      "dst": ["tag:server"],
      "users": ["autogroup:nonroot"]
    }
  ]
}
```

**Step 4: Test access thoroughly**

```bash
# Test Tailscale SSH from your workstation
tailscale ssh username@hostname

# Verify you can run commands
tailscale ssh username@hostname -- whoami
```

**Step 5: Disable traditional SSH (optional)**

Once Tailscale SSH is working reliably, you can disable OpenSSH:

```bash
# Stop and disable OpenSSH
sudo systemctl stop sshd
sudo systemctl disable sshd
```

Many teams keep OpenSSH running on a non-standard port as an emergency backdoor, accessible only from a management network.

---

## Best practices summary

- **Start with explicit deny.** Tailscale SSH denies access by default. Add rules only for the access you need.
- **Use groups, not individual users.** Groups make it easy to onboard and offboard team members without editing ACLs.
- **Tag your servers by role.** Tags like `tag:production`, `tag:staging`, and `tag:database` make ACLs readable and maintainable.
- **Enable session recording for production.** Even if you trust your team, recordings provide invaluable context during incident reviews.
- **Use check mode for high-risk accounts.** Require fresh IdP authentication before granting root or production access.
- **Keep a fallback.** During migration, maintain traditional SSH access until you are confident in the Tailscale setup.
- **Integrate with your IdP.** Tailscale SSH is most powerful when tied to your existing identity provider for SSO and MFA enforcement.
- **Review access regularly.** ACLs can drift over time. Schedule quarterly reviews to remove stale rules and groups.

---

## Wrapping up

Tailscale SSH eliminates the operational burden of SSH key management while adding capabilities traditional SSH cannot match - identity-based access, centralized ACLs, session recording, and seamless IDE integration.

The migration path is low-risk: you can run Tailscale SSH alongside traditional SSH until you are confident in the configuration. Start with a single team or environment, verify the ACLs work as expected, then expand.

For teams already using Tailscale for networking, enabling SSH is a natural next step that closes the loop on secure, auditable server access.

---

Monitor your Tailscale-connected infrastructure with [OneUptime](https://oneuptime.com) - open-source observability for uptime monitoring, incident management, and status pages.
