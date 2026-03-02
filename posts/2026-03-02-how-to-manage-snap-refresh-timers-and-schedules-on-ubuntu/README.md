# How to Manage Snap Refresh Timers and Schedules on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, System Administration, Linux

Description: Learn how to configure snap refresh timers and schedules on Ubuntu to control when automatic snap updates run, including timer syntax and maintenance window configuration.

---

Snapd refreshes installed snaps automatically on a schedule. The default behavior - checking for updates four times per day - is suitable for most desktop users but can be disruptive on servers or workstations where software versions need to be controlled. This guide covers the timer configuration system in detail, explaining the syntax and showing practical configurations for different scenarios.

## How the Default Schedule Works

By default, snapd uses a built-in schedule that spreads refresh checks throughout the day to avoid hammering the Snap Store at predictable times. Each system gets a randomized window within the allowed periods.

```bash
# See the current refresh timer configuration
snap get system refresh.timer

# See when the last refresh ran and when the next one is scheduled
snap refresh --time

# Example output:
# timer: 00:00~24:00/4
# last: today at 09:23 UTC
# next: today at 15:47 UTC
```

The default `00:00~24:00/4` means: between midnight and midnight (all day), with 4 refresh windows distributed throughout.

## Timer Syntax

The refresh timer syntax is flexible and supports several formats:

### Simple Time Windows

```bash
# Set refresh to happen between 2 AM and 4 AM only
sudo snap set system refresh.timer=02:00-04:00

# Set to a specific hour
sudo snap set system refresh.timer=03:00

# Time range with tilde (random start within window)
sudo snap set system refresh.timer=02:00~04:00
```

The difference between `-` and `~`:
- `02:00-04:00` - The refresh can happen anytime in this 2-hour window
- `02:00~04:00` - The refresh starts at a random time within this window (reduces load spikes)

### Day-Based Schedules

```bash
# Only on Monday at 3 AM
sudo snap set system refresh.timer=mon,03:00

# Only on weekends between 2 and 5 AM
sudo snap set system refresh.timer=sat-sun,02:00-05:00

# Weekday maintenance window
sudo snap set system refresh.timer=mon-fri,22:00-23:00

# Multiple separate windows
sudo snap set system refresh.timer="tue,09:00-11:00,thu,09:00-11:00"
```

### Frequency Within a Window

```bash
# Allow up to 4 refreshes per day (default)
sudo snap set system refresh.timer=00:00-24:00/4

# Allow up to 2 refreshes per day, only during business hours
sudo snap set system refresh.timer=08:00-18:00/2

# Only one refresh attempt per week, on Sunday
sudo snap set system refresh.timer=sun,01:00-03:00/1
```

The `/N` suffix specifies how many times snapd can attempt a refresh within the specified period.

### Combining Multiple Schedules

```bash
# Monday and Thursday maintenance windows
sudo snap set system refresh.timer="mon,02:00-04:00,thu,02:00-04:00"

# Daily window plus a weekend window with more time
sudo snap set system refresh.timer="00:00~06:00,sun,00:00-08:00"
```

## Checking and Verifying the Schedule

```bash
# View current timer
snap get system refresh.timer

# View full refresh configuration
snap get system refresh

# Detailed timing information including next scheduled run
snap refresh --time

# Example output after setting a weekly Sunday window:
# timer: sun,02:00-04:00
# last: 5 days ago, at 02:34 UTC
# next: in 2 days, at 02:17 UTC (estimated)
```

## Holding Refreshes Temporarily

Timer configuration sets the window when refreshes can happen. Hold configuration prevents refreshes entirely for a period:

```bash
# Prevent all refreshes for 48 hours
sudo snap refresh --hold=48h

# Hold specific snaps indefinitely
sudo snap refresh --hold=forever firefox code

# Remove holds
sudo snap refresh --unhold firefox
sudo snap refresh --unhold  # Remove global hold

# Check hold status
snap get system refresh.hold
snap get firefox refresh.hold
```

Holds take precedence over timer settings. If a snap is held, it won't refresh even during the configured timer window.

## Practical Timer Configurations

### Desktop Workstation - Business Hours Only

Updates during lunch break when disruption is minimal:

```bash
sudo snap set system refresh.timer="12:00-13:00"
```

### Server - Maintenance Window

Weekly Sunday night updates only:

```bash
sudo snap set system refresh.timer="sun,02:00-04:00"

# Verify
snap refresh --time
# timer: sun,02:00-04:00
```

### Development Machine - Frequent Updates

Get updates as soon as possible:

```bash
sudo snap set system refresh.timer="00:00~24:00/6"  # Up to 6 checks per day
```

### Production Server - Manual Updates Only

Disable automatic refreshes entirely by setting a schedule that never fires, combined with an indefinite hold:

```bash
# Set timer to a window that's very narrow
sudo snap set system refresh.timer="04:00-04:05"

# Also hold all snaps
sudo snap refresh --hold=forever

# To update when you're ready:
sudo snap refresh --unhold
sudo snap refresh
sudo snap refresh --hold=forever  # Re-apply hold after manual update
```

### Staggered Updates for Multiple Servers

When you have multiple servers, stagger their maintenance windows to ensure not all update simultaneously:

```bash
# Server group A - Sunday 1-3 AM
sudo snap set system refresh.timer="sun,01:00-03:00"

# Server group B - Sunday 3-5 AM
sudo snap set system refresh.timer="sun,03:00-05:00"

# Server group C - Sunday 5-7 AM
sudo snap set system refresh.timer="sun,05:00-07:00"
```

## Metered Connection Awareness

Snapd is aware of metered network connections (mobile hotspots, etc.) and by default skips refreshes on metered connections. You can configure this behavior:

```bash
# Check metered connection handling
snap get system refresh.metered

# Allow refreshes even on metered connections
sudo snap set system refresh.metered=ignore

# Restore default (no refreshes on metered)
sudo snap unset system refresh.metered
```

## Applying Timer Settings System-Wide with Ansible

For managing multiple Ubuntu systems:

```yaml
# ansible/tasks/snap-refresh.yml
- name: Configure snap refresh timer
  command: snap set system refresh.timer="{{ snap_refresh_timer }}"
  become: true

- name: Hold snap updates for production systems
  command: snap refresh --hold=forever
  become: true
  when: environment == "production"
```

```bash
# Run against all production servers
ansible -i inventory production -m command \
    -a "snap set system refresh.timer='sun,02:00-04:00'" \
    --become
```

## Monitoring Refresh Activity

```bash
# See recent snap change history (includes refreshes)
snap changes | grep refresh

# Detailed information on a specific refresh event
snap change <change-id>

# Watch refresh activity in real time
sudo journalctl -fu snapd | grep -E "refresh|Refreshed"

# See all snaps and their last refresh times
snap list | awk 'NR==1 || /^[a-z]/'
```

## Troubleshooting Timer Issues

```bash
# If refreshes seem to not be happening as scheduled:

# Check if snapd service is running
sudo systemctl status snapd

# Check snapd logs for errors
sudo journalctl -u snapd -n 100

# Manually trigger a refresh to test
sudo snap refresh

# Check if snaps are held
snap get system refresh.hold
snap list | while read name rest; do
    hold=$(snap get "$name" refresh.hold 2>/dev/null)
    [ -n "$hold" ] && echo "$name: held until $hold"
done
```

The refresh timer system provides enough flexibility to accommodate any update policy, from aggressive automatic updates to fully manual control. The key is matching the timer configuration to your operational requirements and combining it appropriately with the hold mechanism for fine-grained per-snap control.
