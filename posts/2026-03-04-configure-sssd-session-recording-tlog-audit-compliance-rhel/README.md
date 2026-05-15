# How to Configure SSSD Session Recording with tlog for Audit Compliance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSSD, Tlog, Session Recording, Audit, Compliance

Description: Set up SSSD-integrated session recording with tlog on RHEL to record user terminal sessions for audit compliance and security monitoring.

---

RHEL provides tlog for recording terminal sessions, and it integrates with SSSD to selectively record sessions for specific users or groups. This is valuable for compliance requirements that mandate audit trails of privileged user activity.

## Installing tlog

```bash
# Install tlog and SSSD

sudo dnf install tlog sssd -y

# Verify installation
rpm -q tlog
```

## Configuring SSSD for Session Recording

Edit the SSSD session recording configuration.

```bash
sudo vi /etc/sssd/conf.d/sssd-session-recording.conf
```

```ini
[session_recording]
# Scope: none, some, all
scope = some

# Record sessions for specific users
users = admin, devops_user

# Record sessions for specific groups
groups = wheel, sysadmins
```

```bash
# Set proper permissions on the configuration file
sudo chmod 600 /etc/sssd/conf.d/sssd-session-recording.conf
sudo chown root:root /etc/sssd/conf.d/sssd-session-recording.conf

# Enable the SSSD authselect profile
sudo authselect select sssd with-files-domain

# Restart SSSD to apply the session recording config
sudo systemctl restart sssd
```

## Configuring tlog Logging Destination

Configure where tlog stores recordings.

```bash
# Edit the tlog-rec-session configuration
sudo vi /etc/tlog/tlog-rec-session.conf
```

```json
{
    "shell": "/bin/bash",
    "notice": "\nATTENTION: Your session is being recorded.\n",
    "writer": "journal",
    "journal": {
        "priority": "info",
        "augment": true
    }
}
```

## Testing Session Recording

```bash
# Log in as a user who is configured for recording
su - admin
# You should see the recording notice

# The session is now being recorded
# Run some commands
ls /etc
whoami

# Exit the session
exit
```

## Playing Back Recorded Sessions

```bash
# List recorded sessions from the journal
sudo journalctl _COMM=tlog-rec-sessio

# Find the recording ID
sudo journalctl -o verbose _COMM=tlog-rec-sessio | grep TLOG_REC=

# Play back a specific session
sudo tlog-play -r journal -M TLOG_REC=<session-id>

# Count recorded journal entries
sudo journalctl _COMM=tlog-rec-sessio | grep -c tlog-rec-session
```

## Using Cockpit for Session Playback

The RHEL web console (Cockpit) includes a session recording module for visual playback.

```bash
# Install the session recording Cockpit module
sudo dnf install cockpit-session-recording -y

# Enable and start Cockpit
sudo systemctl enable --now cockpit.socket

# Access https://your-server:9090 and navigate to Session Recording
```

Session recording with tlog provides an audit trail of terminal output and, if input logging is enabled, what users typed during their terminal sessions, helping support compliance requirements for PCI DSS, HIPAA, and SOX.
