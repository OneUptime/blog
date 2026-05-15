# Validation Summary: How to Set Up RHEL on a Headless Server Using the VNC Graphical Installer

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Anaconda installer
- VNC / TigerVNC
- GRUB boot parameters
- RHEL network boot options
- SSH local port forwarding
- firewalld and systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Boot options reference for `inst.vnc`, `inst.vncpassword=`, `inst.vncconnect=`, and `ip=`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/custom-boot-options_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Preparing a remote installation by using VNC: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/preparing-a-remote-installation-by-using-vnc_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Remotely accessing the desktop as multiple users with TigerVNC: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/getting_started_with_the_gnome_desktop_environment/remotely-accessing-the-desktop-as-multiple-users_getting-started-with-the-gnome-desktop-environment
- TigerVNC `vncviewer` manual: https://tigervnc.org/doc/vncviewer.html

## Issues Found
- The reverse VNC section referred to `inst.vnc.connect`, but the RHEL 9 installer boot option is `inst.vncconnect=`. Updated the prose to use the correct option name.
- The troubleshooting section suggested `inst.ip` for static addressing. RHEL 9 uses the dracut `ip=` boot option format documented by Red Hat, so this was corrected to `ip=`.
- The post-installation TigerVNC example used `vncserver :1`, which does not match Red Hat's documented RHEL 9 flow for persistent multi-user VNC access. Updated the example to map a user in `/etc/tigervnc/vncserver.users`, set a default GNOME session, open the firewalld VNC service, and start `vncserver@:2` with systemd.

## Review Notes
The installer-focused VNC boot parameters and examples are accurate for RHEL 9. Red Hat notes that systems installed using installer VNC start in text mode, so the separate post-install VNC section assumes an installed graphical environment such as GNOME is available.
