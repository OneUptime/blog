# Validation Summary: How to Configure Corosync Quorum Policies on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Corosync
- votequorum
- corosync-qdevice and corosync-qnetd
- Pacemaker
- pcs CLI

## Sources Consulted
- Debian corosync-quorumtool(8) man page: https://manpages.debian.org/testing/corosync/corosync-quorumtool.8.en.html
- Corosync votequorum(5) man page: https://www.mankier.com/5/votequorum
- Ubuntu corosync-qdevice(8) man page: https://manpages.ubuntu.com/manpages/resolute/man8/corosync-qdevice.8.html
- Ubuntu corosync-qnetd-certutil(8) man page: https://manpages.ubuntu.com/manpages/stonking/man8/corosync-qnetd-certutil.8.html
- Ubuntu corosync.conf(5) man page: https://manpages.ubuntu.com/manpages/jammy/man5/corosync.conf.5.html
- Ubuntu pcs(8) man page: https://manpages.ubuntu.com/manpages/noble/en/man8/pcs.8.html
- Pacemaker Explained 2.1 cluster options: https://clusterlabs.org/projects/pacemaker/doc/2.1/Pacemaker_Explained/singlehtml/

## Issues Found
- Replaced `corosync-quorumtool -v` as a "detailed quorum information" command. The `-v` option changes node votes and requires a vote argument; `-l` is the correct option for listing nodes and votes.
- Changed the two-node pcs example from `pcs quorum update two_node=1` to `pcs quorum config`, because current Ubuntu pcs documentation documents quorum configuration display and does not list `two_node` as a current `pcs quorum update` option.
- Corrected QDevice setup. The qnetd host should run `corosync-qnetd`, while cluster nodes need `corosync-qdevice`; pcs expects the qdevice provider to be configured first with `pcs qdevice setup model net`.
- Corrected the `algorithm=lms` explanation to match corosync-qdevice documentation: LMS returns a vote when a remaining node can still reach qnetd, rather than selecting the side with the "most recent communication."
- Updated Pacemaker `no-quorum-policy` options to include current `fence`, describe `demote` generally, and mark `suicide` as deprecated since Pacemaker 2.1.9.
- Replaced deprecated `pcs property show` usage with `pcs property config`.
- Clarified that `pcs node standby` tests Pacemaker resource evacuation and does not change Corosync quorum; stopping Corosync is the quorum behavior test.
- Renamed the timeout section to membership timeout and corrected the `token_retransmits_before_loss_const` comment from a timeout to a retransmit count.

## Review Notes
The remaining examples are generally version-sensitive and assume a modern pcs/Corosync/Pacemaker stack on Ubuntu. For production guidance, the post could later emphasize fencing requirements for two-node clusters, but the reviewed commands and configuration snippets are now technically accurate for the scope of the article.
