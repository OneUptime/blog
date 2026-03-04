# How to Find Open Files and Sockets with lsof on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on find open files and sockets with lsof using Red Hat Enterprise Linux 9.

---

lsof (list open files) shows every file descriptor a process has open, including regular files, directories, network sockets, pipes, and device files. Since Linux treats almost everything as a file, lsof gives you a comprehensive view of what a process is doing.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Use lsof to inspect open files and connections:

```bash
# Show all open files for a process
lsof -p <PID>

# Show all network connections
lsof -i

# Show who has a specific file open
lsof /var/log/messages

# Show all files opened by a user
lsof -u nginx

# Show listening ports
lsof -i -P -n | grep LISTEN
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status <service-name>

# Review recent logs
journalctl -u <service-name> --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
