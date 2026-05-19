# How to Disable Snap Auto-Updates on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Package Management, System Administration

Description: Learn how to disable or control automatic snap updates on Ubuntu, including holding individual snaps, setting refresh schedules, and managing update windows.

---

By default, snapd checks for and applies snap updates four times per day. For desktop users, this is generally fine - snaps update in the background with minimal disruption. For servers and production systems, uncontrolled automatic updates can be problematic: a new version might break compatibility, introduce unexpected behavior, or trigger restarts at inconvenient times.

This guide covers the available methods to control or disable snap auto-updates, from delaying refreshes to holding specific snaps indefinitely.

## Understanding Snap Refresh Behavior

Before disabling anything, it helps to understand how snapd handles refreshes. Snapd queries the Snap Store periodically and applies updates automatically. The default schedule is four times per day, but snapd respects maintenance windows and will delay refreshes if the system is on a metered connection.

```bash
# Check the current refresh schedule and last refresh time

snap refresh --time

# See when each snap was last refreshed
snap list

# Check if any refreshes are pending
snap refresh --list
```

Snap updates apply differently depending on the snap:
- Command-line snaps update immediately (the next invocation uses the new version)
- Services are stopped and started as part of the refresh, unless the snap developer has configured a different refresh mode
- Desktop applications can defer automatic refreshes while running, and refresh when the app is closed or when the deferral deadline is reached

## Method 1: Holding a Specific Snap

The most targeted approach is holding updates for individual snaps while letting others update normally. This requires snapd 2.58 or later:

```bash
# Hold firefox updates forever
sudo snap refresh --hold=forever firefox

# Hold for a specific duration
sudo snap refresh --hold=168h firefox    # Hold for 1 week
sudo snap refresh --hold=720h firefox    # Hold for 30 days

# Hold multiple snaps at once
sudo snap refresh --hold=forever firefox code chromium

# Check hold status for a snap
snap list firefox

# Remove a hold to allow updates again
sudo snap refresh --unhold firefox

# Manually update a held snap
sudo snap refresh firefox
```

The `--hold=forever` option keeps the snap at its current revision indefinitely. It does not prevent you from manually refreshing - it only blocks automatic refreshes.

## Method 2: Setting a Refresh Schedule

Rather than disabling auto-updates entirely, you can constrain when they happen. This is the recommended approach for production systems - updates still happen, but only during your designated maintenance window:

```bash
# Set updates to only happen on Sunday nights between 2 and 4 AM
sudo snap set system refresh.timer=sun,02:00-04:00

# Multiple windows per week
sudo snap set system refresh.timer="mon,wed,fri,02:00-04:00"

# Only on weekends
sudo snap set system refresh.timer="sat-sun,01:00-05:00"

# Every day in a specific window
sudo snap set system refresh.timer=02:00-04:00

# Verify the schedule was applied
snap get system refresh.timer
snap refresh --time
```

The timer format supports:
- Day names: `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`
- Day ranges: `mon-fri`
- Time ranges: `02:00-04:00` (24-hour format)
- Combinations with commas

## Method 3: Holding All Snaps

To temporarily freeze all snap updates - for example, during a freeze period before a major event or deployment:

```bash
# Hold all snaps for a specific duration
sudo snap refresh --hold=48h

# Hold all snaps forever (not recommended for long-term use)
sudo snap refresh --hold=forever

# Check the global hold
snap get system refresh.hold

# Remove the global hold
sudo snap refresh --unhold
```

## Method 4: Using refresh.retain to Minimize Impact

Even without disabling updates, you can make updates less disruptive by ensuring rollback is always available:

```bash
# Keep the current and one previous revision (default)
sudo snap set system refresh.retain=2

# Keep more history for easier rollback
sudo snap set system refresh.retain=3
```

This doesn't prevent updates but ensures you can revert quickly if a new version causes problems.

## Method 5: Blocking Snap Store Access

On systems where snaps should not be installed or updated from the public Snap Store, you can block snapd's required store endpoints at the network boundary. Snapd uses HTTPS access to the Snap Store API and download CDNs, so a broad local firewall rule like this is a nuclear option and will also block other outbound HTTPS traffic:

```bash
# Block all outbound HTTPS traffic from the host
sudo ufw deny out to any port 443 proto tcp comment "Block outbound HTTPS"
```

A less disruptive approach uses the snap hold mechanism plus a cron job to re-hold before holds expire:

```bash
# Create a script to maintain holds indefinitely
sudo tee /usr/local/sbin/hold-snaps.sh > /dev/null << 'EOF'
#!/bin/bash
# Re-hold all snaps to prevent auto-updates
# Run this weekly via cron to keep holds active

for snap in $(snap list | awk 'NR>1 {print $1}'); do
    snap refresh --hold=720h "$snap" 2>/dev/null
done

echo "$(date): All snaps held for 720 hours" >> /var/log/snap-hold.log
EOF

sudo chmod +x /usr/local/sbin/hold-snaps.sh

# Run weekly via cron (every Sunday at 1 AM)
echo "0 1 * * 0 root /usr/local/sbin/hold-snaps.sh" | sudo tee /etc/cron.d/snap-hold > /dev/null
```

## Checking the Current Update Status

```bash
# See what would be updated if you ran refresh now
snap refresh --list

# See full refresh history
snap changes | grep refresh

# Detailed info on a specific change
snap change <change-id>

# Check when the next automatic refresh is scheduled
snap refresh --time
```

## Handling Security Updates

Even when you hold application snaps, keep an eye on security updates for `snapd` and base snaps such as `core`, `core20`, `core22`, or `core24`. These provide the snap security infrastructure and base runtime environments, so holding them for long periods can leave important fixes unapplied.

```bash
# Check if snapd itself has a pending update
snap refresh --list | grep '^snapd[[:space:]]'

# snapd and base snap updates are typically non-disruptive,
# but they should still be reviewed and applied deliberately
```

## Practical Recommendations

For production servers:
- Use `refresh.timer` to restrict updates to maintenance windows
- Hold application snaps with `--hold=forever` and update them manually after testing
- Avoid holding `snapd` and base snaps such as `core`, `core20`, `core22`, or `core24` for long periods - their security updates are important

For workstations:
- The default schedule is usually fine
- If updates disrupt work, set a narrow window like `02:00-04:00`
- Hold specific snaps if a version works well and you want to keep it

For CI/CD environments:
- Use `--hold=forever` for all snaps to prevent version drift between runs
- Pin specific revision numbers in your configuration management
- Only update after explicitly testing the new version

```bash
# Example: Server production setup
# Allow updates Sunday 3-5 AM only
sudo snap set system refresh.timer="sun,03:00-05:00"

# Hold the application snaps indefinitely
sudo snap refresh --hold=forever myapp
sudo snap refresh --hold=forever postgresql

# Let system snaps (base snaps and snapd) update on schedule
# Their security updates are important
```

Snap's update system is flexible enough to accommodate both the "always latest" approach for consumer systems and the "controlled, tested updates" approach that production environments require. The key is knowing which tools to apply in each context.
