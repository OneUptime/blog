# How to Set Up Header Checks in Postfix on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Postfix, Spam Filtering, Security

Description: Configure Postfix header checks on Ubuntu to filter, reject, or modify messages based on email headers using regex patterns for spam control and policy enforcement.

---

Postfix header checks give you fine-grained control over mail based on message headers. You can reject messages with suspicious headers, strip unwanted header fields, add custom headers, or redirect mail based on header content. Header checks are applied by the `cleanup(8)` daemon before the message is committed to the queue, so a REJECT result is returned to the SMTP client at the end-of-DATA response.

## Types of Postfix Checks

Postfix has several complementary checking mechanisms:

- **Header checks**: Inspect and act on individual header lines
- **Body checks**: Scan the message body content
- **SMTP restrictions**: Control who can connect and send (access lists, RBLs)

Header checks are fastest since they operate on message metadata without scanning the full body.

## How Header Checks Work

Postfix reads each header line (including continuation lines) through your check table. Each line in the table is a regex pattern and an action. When a header line matches a pattern, Postfix performs the action - reject, warn, redirect, discard, or filter.

## Basic Header Check Configuration

### Create the Header Checks File

```bash
sudo nano /etc/postfix/header_checks
```

The file format is: `regex_pattern  action  [message]`

```text
# /etc/postfix/header_checks - Postfix header check rules

# Log every message that has a Subject header (sample WARN rule -
# note that header_checks cannot detect a *missing* header, only match
# headers that are present)
/^Subject:.*$/ WARN

# Reject messages with suspicious executable attachments
/^Content-(Disposition|Type).*\.(bat|cmd|com|cpl|exe|pif|reg|scr|vb|vbs|wsh)/ REJECT Executable attachments are not permitted

# Block messages claiming to be from your own domain but arriving externally
# (configure in check_sender_access for better control, but header checks can catch some cases)
/^From:.*<postmaster@yourdomain\.com>/ REJECT Forged sender address

# Drop Received headers entirely for privacy - IGNORE removes the whole
# header line, not just the IP portion (uncomment to use)
# /^Received:/ IGNORE

# Block messages with base64-encoded executable names
/^Content-Type:.*name=.*\.(exe|bat|cmd|vbs|pif|scr)/ REJECT Blocked attachment type: $0

# Block messages from known spam software that adds telltale headers
/^X-Mailer:.*(theophilus|icecast|DM1|Mass Mailer|Massive Mailer)/ REJECT Bulk mailer not permitted

# Warn on unusual MIME boundaries (informational only)
/^Content-Type:.*boundary="----=_NextPart_000_/ WARN Suspicious MIME boundary

# Block messages with HTML comment injection patterns in subjects
/^Subject:.*<!--.*-->/ REJECT HTML injection detected in subject

# Strip X-Originating-IP for outbound mail privacy (on submission port)
# /^X-Originating-IP:/ IGNORE
```

### Register the Header Checks in Postfix

```bash
sudo nano /etc/postfix/main.cf
```

Add or modify:

```text
# Header checks for incoming SMTP connections
header_checks = regexp:/etc/postfix/header_checks

# Optionally, separate rules applied by the smtp(8) client when
# delivering mail out to remote servers
# smtp_header_checks = regexp:/etc/postfix/smtp_header_checks
```

```bash
# Reload Postfix to apply the configuration
sudo systemctl reload postfix
```

## Available Actions

Postfix header checks support several actions:

| Action | Description |
|--------|-------------|
| `REJECT [message]` | Reject the message with a 5xx error code |
| `WARN [message]` | Log a warning but deliver the message |
| `DISCARD [message]` | Accept but silently drop (no bounce) |
| `HOLD [message]` | Hold the message in the hold queue for review |
| `IGNORE` | Delete this header line (strip it from the message) |
| `FILTER transport:nexthop` | Redirect to a different transport |
| `REDIRECT user@domain` | Redirect to a different address |
| `BCC user@domain` | Send a blind copy |
| `PREPEND header: value` | Add a header before the current line |

## Practical Header Check Examples

### Blocking Specific Attachment Types

Executable attachments are a common malware vector. Block them at the MTA level:

```bash
sudo nano /etc/postfix/header_checks
```

```text
# Block common executable attachment types
/^Content-Type:.*name=.*\.(ade|adp|bat|chm|cmd|com|cpl|crt|exe|hlp|hta|inf|ins|isp|jse|lnk|mdb|mde|msc|msi|msp|mst|pcd|pif|reg|scr|sct|shs|shb|vb|vbe|vbs|wsc|wsf|wsh)(\s|")/  REJECT Blocked attachment type

# Also block in Content-Disposition headers
/^Content-Disposition:.*filename=.*\.(exe|bat|cmd|vbs|pif|scr|cpl|msi)(\s|")/  REJECT Blocked attachment filename
```

### Filtering Spam Signatures

Block messages with known spam characteristics:

```text
# Pharmaceutical spam common patterns
/^Subject:.*\b(v.?i.?a.?g.?r.?a|c.?i.?a.?l.?i.?s|l.?e.?v.?i.?t.?r.?a)\b/i  REJECT Pharmaceutical spam

# Lottery/advance fee fraud patterns
/^Subject:.*(you have won|lottery|claim your|prize notification|congratulations.*winner)/i  REJECT

# Suspicious encoding in From header (common in phishing)
/^From:.*=\?UTF-8\?B\?/  WARN Suspicious encoding in From header

# Empty or missing From header
/^From:\s*$/ REJECT Missing From header
```

### Stripping Tracking Headers

Remove headers that reveal internal network information:

```text
# Remove internal IP addresses from Received headers (uncomment for outbound)
# /^Received:.*192\.168\.|^Received:.*10\.|^Received:.*172\.(1[6-9]|2[0-9]|3[01])\./ IGNORE

# Strip client software identification
/^X-Mailer:/ IGNORE
/^X-Originating-IP:/ IGNORE

# Strip spam filter scores from internal systems before forwarding outbound
/^X-Spam-Score:/ IGNORE
/^X-Spam-Status:/ IGNORE
```

### Adding Custom Headers

Use PREPEND to add informational headers:

```text
# Add a note to messages that pass header checks
/^Subject:/ PREPEND X-Header-Checked: yes
```

## Body Checks

Similar to header checks, body checks scan the message body:

```bash
sudo nano /etc/postfix/body_checks
```

```text
# Block messages containing known phishing URLs
/http:\/\/.*\.ru\/.*login/i  REJECT Suspected phishing URL

# Block Social Security Number patterns (DLP-style rule)
/\b\d{3}-\d{2}-\d{4}\b/  WARN Possible SSN in message body

# Block credit card number patterns (very approximate, many false positives)
# /\b4[0-9]{12}(?:[0-9]{3})?\b/  WARN Possible credit card number
```

Register body checks in main.cf:

```text
body_checks = regexp:/etc/postfix/body_checks
```

## Using pcre: for Better Performance

Postfix supports both `regexp:` (POSIX regex) and `pcre:` (Perl-compatible regex). PCRE is faster and more powerful:

```bash
# Install libpcre support for Postfix
sudo apt install -y postfix-pcre

# Change main.cf to use pcre
# header_checks = pcre:/etc/postfix/header_checks
```

Both `regexp:` and `pcre:` tables are case-insensitive by default in Postfix - the `/i` flag toggles that behaviour (so `/.../I` makes matching case-sensitive). PCRE additionally supports advanced features like lookaheads, lookbehinds, and non-greedy quantifiers that POSIX regexp does not.

## Testing Header Checks

### Test with Postfix's postmap Command

```bash
# Test a specific header line against your rules
postmap -q "Content-Type: application/octet-stream; name=\"malware.exe\"" \
  regexp:/etc/postfix/header_checks
```

### Send a Test Message

```bash
# Send a test message and check if the rule fires
swaks --to your-test@yourdomain.com \
  --from test@example.com \
  --header "Subject: This is a test" \
  --body "Test body"

# Check the mail log
sudo tail -f /var/log/mail.log
```

### Debug Mode

To see which header_checks rules fire, enable verbose logging on the `cleanup(8)` daemon by editing `master.cf`:

```bash
sudo nano /etc/postfix/master.cf
```

Append `-v` to the cleanup service entry, then reload Postfix:

```text
cleanup   unix  n       -       y       -       0       cleanup -v
```

Alternatively, use the `WARN` (or `INFO`) action in `header_checks` itself - matches are logged without rejecting:

```bash
sudo grep "header_checks" /var/log/mail.log | tail -20
```

## Protecting Against Header Injection

A specific concern for outbound mail is header injection - where attackers craft messages with embedded newlines to insert additional headers. Postfix handles this at the SMTP protocol level: the `smtpd(8)` daemon parses headers one logical line at a time, and the `cleanup(8)` daemon presents each header to `header_checks` with the trailing newline already stripped. That means regex patterns that try to match `\n` inside a header line will never fire - header injection must be prevented at the application layer that submits the message (for example, the web app or mail submission script).

You can, however, use `header_checks` to flag suspicious encoded headers that are sometimes seen in injection attempts:

```text
# Flag base64-encoded headers for review (high false-positive rate)
/^(To|Cc|From|Reply-To):.*=\?.*\?B\?/  WARN Encoded recipient header
```

## Combining Header Checks with MIME Checks

For more sophisticated attachment filtering, combine header checks with Postfix's built-in MIME checks:

```bash
sudo nano /etc/postfix/main.cf
```

```text
# Enable MIME header checks
mime_header_checks = regexp:/etc/postfix/mime_header_checks
```

```bash
sudo nano /etc/postfix/mime_header_checks
```

```text
# Stricter attachment checks in the MIME headers
/^Content-Type:.*application\/x-msdownload/  REJECT Windows executable attachment
/^Content-Type:.*application\/x-sh/  REJECT Shell script attachment
/^Content-Type:.*text\/html.*name=/  WARN HTML file attachment

# Block password-protected archives (often used to bypass scanners)
/^Content-Type:.*zip.*password/i  HOLD Password-protected archive needs review
```

Header checks are a lightweight first line of defense that runs before more expensive operations like antivirus scanning. Well-tuned header rules can block a substantial fraction of spam and malware with minimal server overhead. Start conservatively with WARN actions and only switch to REJECT once you are confident a rule does not have false positives.
