# How to Automate Daily Reports with Bash on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash Scripting, Automation, Cron, Server Administration

Description: A practical guide to writing and scheduling automated daily reports using Bash on Ubuntu, covering system metrics, log analysis, and email delivery via cron.

---

Running the same commands every morning to check on your servers gets old fast. A well-structured daily report script runs while you sleep, lands in your inbox before you start work, and flags issues before users notice them. This guide walks through building a practical daily report system using Bash on Ubuntu.

## What Makes a Good Daily Report

Before writing any code, figure out what you actually want to know each day:

- Disk usage trends (are you running out of space?)
- Failed services (what broke overnight?)
- Authentication failures (who is trying to log in?)
- Package update availability
- CPU and memory baselines
- Backup status
- Top resource consumers

A report that is too long gets skimmed. One that is too short misses important data. Aim for a report you will actually read.

## Basic Report Script Structure

```bash
#!/bin/bash
# daily_report.sh - Daily server health report
# Schedule with: 0 7 * * * /usr/local/bin/daily_report.sh

set -euo pipefail

# Configuration
HOSTNAME="$(hostname -f)"
REPORT_DATE="$(date '+%Y-%m-%d')"
REPORT_TIME="$(date '+%H:%M:%S')"
RECIPIENT="ops-team@example.com"
FROM_ADDRESS="reports@${HOSTNAME}"
DISK_WARN_PERCENT=80
LOG_FILE="/var/log/daily_report.log"

# Report buffer - we build the report as a string
REPORT=""

# Helper to append a section to the report
section() {
    local title="$1"
    REPORT+="
==================================================
 ${title}
==================================================
"
}

append() {
    REPORT+="$1
"
}

# Log that the report ran (separate from report content)
echo "$(date): Daily report starting" >> "$LOG_FILE"
```

## System Health Sections

```bash
# System overview section
report_system_overview() {
    section "SYSTEM OVERVIEW"
    append "Hostname:     $HOSTNAME"
    append "Date/Time:    $REPORT_DATE $REPORT_TIME"
    append "Uptime:       $(uptime -p)"
    append "OS:           $(lsb_release -ds)"
    append "Kernel:       $(uname -r)"
    append "Last Boot:    $(who -b | awk '{print $3, $4}')"
}

# CPU and load
report_cpu() {
    section "CPU & LOAD"
    append "Load Average: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"
    append "CPU Cores:    $(nproc)"

    # Load relative to CPU count
    local load_1m
    load_1m=$(cat /proc/loadavg | awk '{print $1}')
    local cpu_count
    cpu_count=$(nproc)
    local load_percent
    load_percent=$(echo "scale=0; $load_1m * 100 / $cpu_count" | bc)

    if [ "$load_percent" -gt 90 ]; then
        append "WARNING: Load is at ${load_percent}% of capacity!"
    fi

    append ""
    append "Top CPU Consumers:"
    ps aux --sort=-%cpu | head -6 | awk 'NR>1 {printf "  %-20s %5s%%\n", $11, $3}'
}

# Memory usage
report_memory() {
    section "MEMORY"
    free -h | while read -r line; do
        append "  $line"
    done

    # Alert on high memory usage
    local mem_used_percent
    mem_used_percent=$(free | awk '/^Mem/ {printf "%.0f", $3/$2 * 100}')
    if [ "$mem_used_percent" -gt 90 ]; then
        append ""
        append "WARNING: Memory usage is at ${mem_used_percent}%!"
    fi

    append ""
    append "Top Memory Consumers:"
    ps aux --sort=-%mem | head -6 | awk 'NR>1 {printf "  %-20s %5s%%\n", $11, $4}'
}

# Disk usage
report_disk() {
    section "DISK USAGE"

    df -h --output=target,size,used,avail,pcent | head -1 | while read -r line; do
        append "  $line"
    done

    # Check each filesystem and warn if over threshold
    local warnings=""
    while IFS= read -r line; do
        local percent
        percent=$(echo "$line" | awk '{print $5}' | tr -d '%')
        local mount
        mount=$(echo "$line" | awk '{print $1}')

        append "  $line"

        if [ -n "$percent" ] && [ "$percent" -gt "$DISK_WARN_PERCENT" ]; then
            warnings+="  WARNING: ${mount} is at ${percent}% capacity\n"
        fi
    done < <(df -h --output=target,size,used,avail,pcent | tail -n +2)

    if [ -n "$warnings" ]; then
        append ""
        append "DISK WARNINGS:"
        append "$warnings"
    fi
}
```

## Service and Security Sections

```bash
# Failed services
report_failed_services() {
    section "FAILED SERVICES"
    local failed
    failed=$(systemctl list-units --state=failed --no-legend --no-pager 2>/dev/null | wc -l)

    if [ "$failed" -eq 0 ]; then
        append "No failed services."
    else
        append "ALERT: $failed failed service(s)!"
        append ""
        systemctl list-units --state=failed --no-legend --no-pager 2>/dev/null | while read -r line; do
            append "  $line"
        done
    fi
}

# Authentication failures from the last 24 hours
report_auth_failures() {
    section "AUTH FAILURES (LAST 24 HOURS)"
    local since
    since=$(date --date='24 hours ago' '+%Y-%m-%d %H:%M:%S')

    # Count failed SSH login attempts
    local fail_count
    fail_count=$(journalctl -u ssh -u sshd --since "$since" 2>/dev/null | \
        grep -c "Failed password\|Invalid user\|authentication failure" || echo 0)

    append "Total failed SSH attempts: $fail_count"

    if [ "$fail_count" -gt 0 ]; then
        append ""
        append "Top attacking IPs:"
        journalctl -u ssh -u sshd --since "$since" 2>/dev/null | \
            grep -oP 'from \K[\d.]+' | \
            sort | uniq -c | sort -rn | head -10 | \
            awk '{printf "  %5d attempts from %s\n", $1, $2}' | \
            while read -r line; do append "$line"; done
    fi
}

# Sudo usage
report_sudo_activity() {
    section "SUDO ACTIVITY (LAST 24 HOURS)"
    local since
    since=$(date --date='24 hours ago' '+%Y-%m-%d %H:%M:%S')

    journalctl --since "$since" 2>/dev/null | \
        grep "sudo:" | \
        grep -v "session opened\|session closed" | \
        tail -20 | \
        while read -r line; do append "$line"; done
}

# Available updates
report_updates() {
    section "AVAILABLE UPDATES"
    local update_count
    update_count=$(apt-get -s upgrade 2>/dev/null | grep -c "^Inst" || echo 0)
    local security_count
    security_count=$(apt-get -s upgrade 2>/dev/null | grep -c "^Inst.*security" || echo 0)

    append "Available updates:  $update_count"
    append "Security updates:   $security_count"

    if [ "$security_count" -gt 0 ]; then
        append ""
        append "Security packages needing update:"
        apt-get -s upgrade 2>/dev/null | grep "^Inst.*security" | head -10 | \
            awk '{print "  " $2}' | while read -r line; do append "$line"; done
    fi
}

# Recent cron errors
report_cron() {
    section "CRON ERRORS (LAST 24 HOURS)"
    local since
    since=$(date --date='24 hours ago' '+%Y-%m-%d %H:%M:%S')

    local cron_errors
    cron_errors=$(journalctl -u cron --since "$since" 2>/dev/null | grep -i "error\|fail" | wc -l)

    if [ "$cron_errors" -eq 0 ]; then
        append "No cron errors."
    else
        append "Cron errors found: $cron_errors"
        journalctl -u cron --since "$since" 2>/dev/null | grep -i "error\|fail" | \
            while read -r line; do append "$line"; done
    fi
}
```

## Sending the Report

```bash
# Assemble and send the report
send_report() {
    local subject="Daily Report: $HOSTNAME - $REPORT_DATE"

    if command -v mail &>/dev/null; then
        echo "$REPORT" | mail -s "$subject" -r "$FROM_ADDRESS" "$RECIPIENT"
        echo "$(date): Report sent to $RECIPIENT" >> "$LOG_FILE"
    elif command -v sendmail &>/dev/null; then
        {
            echo "To: $RECIPIENT"
            echo "From: $FROM_ADDRESS"
            echo "Subject: $subject"
            echo ""
            echo "$REPORT"
        } | sendmail -t
    else
        # Fall back to saving locally
        local report_file="/var/reports/daily_${REPORT_DATE}.txt"
        mkdir -p /var/reports
        echo "$REPORT" > "$report_file"
        echo "$(date): Report saved to $report_file" >> "$LOG_FILE"
    fi
}

# Main execution
report_system_overview
report_cpu
report_memory
report_disk
report_failed_services
report_auth_failures
report_updates
report_cron

# Footer
section "END OF REPORT"
append "Generated by daily_report.sh on $HOSTNAME"
append "Log: $LOG_FILE"

send_report
```

## Setting Up Email on Ubuntu

```bash
# Install mail utilities
sudo apt install -y mailutils postfix

# During postfix setup, choose "Internet Site" and enter your hostname
# For relay through an SMTP server:
sudo tee -a /etc/postfix/main.cf <<EOF
relayhost = [smtp.yourdomain.com]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_use_tls = yes
EOF

# Set credentials
echo "[smtp.yourdomain.com]:587 username:password" | sudo tee /etc/postfix/sasl_passwd
sudo postmap /etc/postfix/sasl_passwd
sudo chmod 600 /etc/postfix/sasl_passwd
sudo systemctl restart postfix
```

## Scheduling with Cron

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/daily_report.sh

# Add to crontab - runs at 7am every day
sudo crontab -e
```

```cron
# Daily server report at 7:00 AM
0 7 * * * /usr/local/bin/daily_report.sh
```

## Testing the Script

```bash
# Run manually to test
sudo /usr/local/bin/daily_report.sh

# Check the log
tail -f /var/log/daily_report.log
```

Start with a minimal report and add sections as you identify what information is actually useful to you. The best report is one that gives you actionable information in under two minutes of reading.
