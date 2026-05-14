# Validation Summary: How to Set Up VNC Remote Desktop Access on RHEL Using TigerVNC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- TigerVNC server and viewer
- systemd
- firewalld
- OpenSSH tunneling
- GNOME desktop sessions

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Remotely accessing the desktop as multiple users": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/getting_started_with_the_gnome_desktop_environment/remotely-accessing-the-desktop-as-multiple-users_getting-started-with-the-gnome-desktop-environment
- TigerVNC official vncviewer manual page: https://tigervnc.org/doc/vncviewer.html
- firewalld official firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux 9.7 Release Notes, "Deprecated functionalities": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.7_release_notes/deprecated-functionalities

## Issues Found
- The VNC viewer examples used `your-server-ip:5901` and `localhost:5901` for direct TCP port connections. TigerVNC interprets a single colon as a display number; a raw TCP port uses a double colon. Changed these examples to `your-server-ip::5901` and `localhost::5901`.
- The troubleshooting section used `vncserver -kill :1` and `vncserver -list`. Current RHEL TigerVNC documentation manages configured sessions through the `vncserver@` systemd unit. Changed these examples to `sudo systemctl stop vncserver@:1` and `systemctl list-units 'vncserver@*'`.

## Review Notes
- Red Hat documents the same `/etc/tigervnc/vncserver.users` mapping format, per-user `~/.vnc/config` support, `session=gnome`, `geometry`, `securitytypes`, `dnf install tigervnc-server`, `dnf install tigervnc`, and firewalld port-opening approach used in the post.
- Red Hat recommends starting multi-user VNC mappings at display `:2` / TCP port `5902`, although display `:1` / port `5901` remains a valid mapping when it does not conflict with local use.
- TigerVNC is deprecated in RHEL 9 and has been removed in RHEL 10. The tutorial remains technically valid for RHEL versions where the TigerVNC packages are still available, but future updates should call out the RHEL 9 deprecation and RHEL 10 removal explicitly.
