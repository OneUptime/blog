# How to Set Up Polkit Rules for Privilege Escalation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Polkit, System Administration, Privilege Management

Description: Configure Polkit rules on Ubuntu to grant fine-grained privilege escalation to specific users or groups without giving full sudo access or requiring a password prompt.

---

Polkit (formerly PolicyKit) is an authorization framework that allows unprivileged processes to communicate with privileged ones. Unlike sudo, which works at the shell level, Polkit handles authorization requests from applications and system daemons. When a user clicks "Install" in the software center or tries to manage a network connection, Polkit decides whether to allow the action, prompt for authentication, or deny it outright.

Understanding Polkit lets you grant specific elevated permissions to users or groups without giving them unrestricted sudo access.

## How Polkit Works

The flow is straightforward:

1. An application (the "subject") requests a privileged action
2. The action is identified by a string like `org.freedesktop.NetworkManager.network-control`
3. Polkit checks its rules to determine the authorization requirement
4. If required, it presents an authentication dialog (or returns a denial for non-interactive sessions)

Polkit has two rule systems:
- **Legacy `.pkla` files** (INI-style, `/etc/polkit-1/localauthority/`)
- **Modern `.rules` files** (JavaScript, `/etc/polkit-1/rules.d/`)

Ubuntu's current versions use both, but the `.rules` approach is preferred for new configurations.

## Viewing Available Actions

Before writing rules, you need to know the action identifiers:

```bash
# List all registered Polkit actions
pkaction

# Show details for a specific action
pkaction --action-id org.freedesktop.NetworkManager.network-control --verbose
```

Search for actions related to a specific topic:

```bash
pkaction | grep -i network
pkaction | grep -i systemd
pkaction | grep -i packagekit
```

Check what an action requires currently:

```bash
pkaction --action-id org.freedesktop.login1.reboot --verbose
# Look for "implicit any", "implicit inactive", and "implicit active" fields
```

## Writing Modern JavaScript Rules

Rules live in `/etc/polkit-1/rules.d/` and are processed in alphabetical order. Lower-numbered files take precedence.

### Basic rule structure

```bash
sudo nano /etc/polkit-1/rules.d/50-local.rules
```

```javascript
// Basic rule file structure
polkit.addRule(function(action, subject) {
    // action.id: the action being requested
    // subject: info about the requesting process/user

    if (action.id == "org.freedesktop.NetworkManager.network-control") {
        if (subject.isInGroup("netadmin")) {
            return polkit.Result.YES;  // Allow without password
        }
    }
});
```

### Allow a group to restart specific services without password

A common use case: letting application operators restart their application's service without full sudo access.

```bash
sudo nano /etc/polkit-1/rules.d/60-service-restart.rules
```

```javascript
// Allow 'appops' group to manage the webapp service without authentication
polkit.addRule(function(action, subject) {
    if (action.id == "org.freedesktop.systemd1.manage-units") {
        // Check the unit being managed
        if (action.lookup("unit") == "webapp.service" &&
            (action.lookup("verb") == "start" ||
             action.lookup("verb") == "stop" ||
             action.lookup("verb") == "restart")) {

            if (subject.isInGroup("appops")) {
                return polkit.Result.YES;
            }
        }
    }
});
```

Create the group and add users:

```bash
sudo groupadd appops
sudo usermod -aG appops deployuser
```

Now `deployuser` can run `systemctl restart webapp.service` without a password prompt.

### Allow a specific user to manage network connections

```javascript
// Let 'netmanager' user control network interfaces
polkit.addRule(function(action, subject) {
    var networkActions = [
        "org.freedesktop.NetworkManager.network-control",
        "org.freedesktop.NetworkManager.wifi.share.open",
        "org.freedesktop.NetworkManager.settings.modify.system"
    ];

    if (networkActions.indexOf(action.id) !== -1) {
        if (subject.user == "netmanager") {
            return polkit.Result.YES;
        }
    }
});
```

### Require authentication for sensitive actions, but only from specific group

```javascript
// Require password for disk management, but only allow the 'diskadmin' group to authenticate
polkit.addRule(function(action, subject) {
    if (action.id == "org.freedesktop.udisks2.filesystem-mount") {
        if (subject.isInGroup("diskadmin")) {
            return polkit.Result.AUTH_SELF;  // Require own password
        } else {
            return polkit.Result.NO;  // Deny others entirely
        }
    }
});
```

Return values available:

| Return value | Meaning |
|---|---|
| `polkit.Result.YES` | Allow without authentication |
| `polkit.Result.NO` | Deny unconditionally |
| `polkit.Result.AUTH_SELF` | Require user's own password |
| `polkit.Result.AUTH_ADMIN` | Require admin (root) password |
| `polkit.Result.AUTH_SELF_KEEP` | Allow and cache auth for session |
| `polkit.Result.AUTH_ADMIN_KEEP` | Allow with cached admin auth |

## Using Legacy .pkla Files

Older documentation often references `.pkla` files. They still work on current Ubuntu but are not the recommended approach for new configurations.

```bash
sudo nano /etc/polkit-1/localauthority/50-local.d/allow-network-restart.pkla
```

```ini
[Allow netadmin group to control networking]
Identity=unix-group:netadmin
Action=org.freedesktop.NetworkManager.network-control
ResultAny=yes
ResultInactive=yes
ResultActive=yes
```

The `Result*` fields correspond to different session states:
- `ResultAny` - any session type
- `ResultInactive` - user not on active console
- `ResultActive` - user on active console

## Testing Polkit Rules

After writing or modifying rules, test them using `pkcheck`:

```bash
# Test if a user can perform an action (run as that user or specify via --process)
pkcheck --action-id org.freedesktop.NetworkManager.network-control \
        --process $(pgrep bash | head -1) \
        --enable-internal-agent
```

Or use `polkit` to simulate authorization:

```bash
# Check what result a given user would get
sudo -u deployuser pkaction --action-id org.freedesktop.systemd1.manage-units --verbose
```

View Polkit logs to see authorization decisions:

```bash
journalctl -u polkit -f
```

## Reloading Polkit Rules

Polkit monitors its rules directories and typically reloads automatically. To force a reload:

```bash
sudo systemctl restart polkit
```

## Debugging Common Issues

**Rule not applying**: Check the file has correct permissions (readable by root) and valid JavaScript syntax. A JavaScript error in the file will cause it to be skipped silently.

```bash
# Check polkit service logs for rule parsing errors
journalctl -u polkit --since "5 minutes ago"
```

**Action ID not found**: Use `pkaction | grep <keyword>` to find the exact action identifier. Action IDs are case-sensitive.

**Group membership not recognized**: A user must log out and back in for new group memberships to take effect in Polkit (same as sudo group membership).

Polkit fills a specific niche that sudo doesn't cover well: graphical applications and D-Bus services that need fine-grained authorization without a terminal. Once you understand the action ID system, writing rules to grant precise permissions is straightforward and more granular than broad sudo entries.
