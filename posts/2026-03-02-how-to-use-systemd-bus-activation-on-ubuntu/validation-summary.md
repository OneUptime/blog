# Validation Summary: How to Use systemd Bus Activation on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- systemd (Type=dbus services, BusName= directive, unit files)
- D-Bus (system bus, activation, .service files, policy files)
- dbus-python (python3-dbus bindings)
- GLib main loop (gi.repository.GLib)
- dbus-send, gdbus, dbus-monitor CLI tools
- Ubuntu (apt package management)

## Sources Consulted
- D-Bus Specification — https://dbus.freedesktop.org/doc/dbus-specification.html
- Desktop Entry / D-Bus Activation Spec — https://specifications.freedesktop.org/desktop-entry/latest/dbus.html
- dbus-daemon man page — https://manpages.debian.org/testing/dbus/dbus-daemon.1.en.html
- dbus-send reference — https://dbus.freedesktop.org/doc/dbus-send.1.html
- gdbus(1) man pages — https://manpages.ubuntu.com/manpages/bionic/man1/gdbus.1.html
- Ubuntu python3-dbus package — https://packages.ubuntu.com/jammy/python3-dbus
- systemd Type=dbus behavior — https://github.com/systemd/systemd/issues/21681

## Issues Found
No technical issues found.

All seven verified items pass:
- `[D-BUS Service]` section header and fields (`Name=`, `Exec=`, `User=`, `SystemdService=`) are exactly per spec.
- `Type=dbus` requires `BusName=`; service is marked active once the name is claimed.
- `python3-dbus` is the correct Ubuntu package (Focal through Noble).
- `gdbus introspect --system --dest <name> --object-path <path>` syntax is valid.
- `systemctl reload dbus` properly reloads policy (sends SIGHUP).
- `/usr/share/dbus-1/system.d/` is a valid policy location.
- `dbus-send` invocation form with `Interface.Method` and `string:` typed arg is correct.

The Python dbus-python code (BusName retention via local variable scope, DBusGMainLoop initialization order, Type=dbus + BusName= matching) is also accurate.

## Review Notes
- Policy file convention: `/usr/share/dbus-1/system.d/` is for package-installed policy; `/etc/dbus-1/system.d/` is the conventional location for site-local admin overrides. Either works; the post's choice is fine for a service installed by hand.
- `dbus-python` is functional and remains the standard package binding, but newer projects sometimes prefer `pydbus` or `gdbus` via PyGObject. Not an error — just a forward-looking note.
- The example `Restart=on-failure` combined with the idle-exit pattern shown later is intentionally correct: clean exits won't trigger a restart, so the on-demand activation cycle works as described.
- The `import sys` in the Python script is unused but harmless.
