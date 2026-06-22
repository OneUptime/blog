# Validation Summary: How to Set Up Remote Desktop with XRDP on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- XRDP
- xorgxrdp
- Xvnc/Xorg
- XFCE, GNOME, KDE Plasma
- systemd
- OpenSSL and TLS certificates
- Let's Encrypt / Certbot
- UFW and iptables
- FreeRDP, Remmina, Microsoft Remote Desktop
- PipeWire XRDP audio
- FUSE drive redirection
- PAM limits

## Sources Consulted
- Ubuntu xrdp.ini manpage: https://manpages.ubuntu.com/manpages/noble/man5/xrdp.ini.5.html
- Ubuntu sesman.ini manpage: https://manpages.ubuntu.com/manpages/noble/man5/sesman.ini.5.html
- Ubuntu xrdp-sesadmin manpage: https://manpages.ubuntu.com/manpages/noble/man8/xrdp-sesadmin.8.html
- Ubuntu xfreerdp manpage: https://manpages.ubuntu.com/manpages/noble/man1/xfreerdp.1.html
- Ubuntu package page for xrdp: https://packages.ubuntu.com/noble/xrdp
- Ubuntu package page for xorgxrdp: https://packages.ubuntu.com/noble/xorgxrdp
- Ubuntu package page for pipewire-module-xrdp: https://packages.ubuntu.com/noble/pipewire-module-xrdp
- Ubuntu package page for freerdp2-x11: https://packages.ubuntu.com/noble/freerdp2-x11
- Ubuntu UFW documentation: https://help.ubuntu.com/community/UFW
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- NeutrinoLabs xrdp sample xrdp.ini: https://github.com/neutrinolabs/xrdp/blob/devel/xrdp/xrdp.ini.in
- NeutrinoLabs xrdp sample sesman.ini: https://github.com/neutrinolabs/xrdp/blob/devel/sesman/sesman.ini.in
- NeutrinoLabs pipewire-module-xrdp documentation: https://github.com/neutrinolabs/pipewire-module-xrdp

## Issues Found
- The `xserverbpp` setting was shown under `[Globals]`, but the XRDP manpage defines it as a connection-section setting used by Xvnc/X11rdp. Moved it under `[Xvnc]` and clarified that Xorg uses the xorgxrdp backend.
- The TLS snippet described `ssl_protocols` as cipher-suite configuration. Updated the comment to correctly describe it as TLS protocol-version selection.
- The Let's Encrypt hook used `/etc/letsencrypt/renewal-hooks/post/`, which runs after renewal attempts. Changed it to `/etc/letsencrypt/renewal-hooks/deploy/` so XRDP restarts after successful certificate deployment.
- The UFW block opened port 3389 to all sources and then added a restricted subnet rule, leaving the service exposed broadly. Changed the example so users choose either general access or the restricted subnet rule.
- The Windows `.rdp` example was framed as “better security” while disabling CredSSP. Reworded it as reusable connection settings and removed the `enablecredsspsupport:i:0` line.
- Normalized `xrdp-sesadmin` examples to the documented `-u=root -c=list` option form.
- The session-management helper used `pkill -f "Xvnc\|Xorg"`, which treats the alternation incorrectly for `pkill` extended regex matching. Changed it to `pkill -f "Xvnc|Xorg"`.
- The performance section included `use_vsock=false`, which is not a documented XRDP `xrdp.ini` setting, and showed Xorg `param` entries in the wrong context with a misleading hardware-cursor comment. Removed those lines and used documented global performance-related settings.

## Review Notes
The post is generally accurate for Ubuntu 24.04-era XRDP packages. GNOME over XRDP remains version- and environment-sensitive, so XFCE remains the most reliable recommendation for broad tutorial use.
