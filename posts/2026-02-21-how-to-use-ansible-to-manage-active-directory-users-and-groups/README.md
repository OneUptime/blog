# How to Use Ansible to Manage Active Directory Users and Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Active Directory, Windows, User Management

Description: Automate Active Directory user and group management with Ansible using the microsoft.ad collection for scalable identity operations.

---

Active Directory is the identity backbone of most enterprise Windows environments. Managing users, groups, organizational units, and memberships through the GUI is fine when you have a handful of accounts, but it quickly becomes unmanageable at scale. Onboarding 50 new employees, creating service accounts for a new application deployment, or restructuring group memberships across departments -- these are tasks that benefit enormously from automation.

Ansible's `microsoft.ad` collection (and the older `community.windows` modules) provides purpose-built modules for Active Directory management. This post covers the most common AD automation scenarios with practical, ready-to-use playbooks.

## Prerequisites

Install the `microsoft.ad` collection on your Ansible control node:

```bash
# Install the Microsoft AD collection
ansible-galaxy collection install microsoft.ad

# You also need the windows collection for some supporting tasks
ansible-galaxy collection install ansible.windows
```

Your Ansible service account needs the appropriate AD permissions. For user and group management, it typically needs to be a member of the "Account Operators" group or have delegated permissions on the target OUs.

The playbooks in this post should be run against a domain controller or a server with the RSAT AD PowerShell module installed.

## Creating Active Directory Users

The `microsoft.ad.user` module handles user creation and management:

```yaml
# playbook-create-user.yml
# Creates a new Active Directory user with standard attributes
- name: Create AD user
  hosts: domain_controllers
  tasks:
    - name: Create new employee account
      microsoft.ad.user:
        name: jdoe
        firstname: John
        surname: Doe
        display_name: "John Doe"
        email: jdoe@corp.local
        upn: jdoe@corp.local
        password: "{{ vault_initial_password }}"
        update_password: on_create
        path: "OU=Employees,OU=Users,DC=corp,DC=local"
        state: present
        enabled: true
        attributes:
          set:
            title: "Software Engineer"
            department: "Engineering"
            company: "Acme Corp"
            telephoneNumber: "+1-555-0100"
      register: user_result

    - name: Display user creation result
      ansible.builtin.debug:
        msg: "User {{ user_result.distinguished_name }} created successfully"
      when: user_result.changed
```

The `update_password: on_create` setting is important. It means the password is only set when the account is first created. Subsequent playbook runs will not reset the password, which would be extremely disruptive for existing users.

## Bulk User Creation

For onboarding multiple users at once, use a variable list or CSV file:

```yaml
# playbook-bulk-users.yml
# Creates multiple AD users from a variable list
- name: Bulk create AD users
  hosts: domain_controllers
  vars:
    new_employees:
      - username: asmith
        first: Alice
        last: Smith
        title: "Senior Developer"
        department: Engineering
        ou: "OU=Employees,OU=Users,DC=corp,DC=local"

      - username: bjones
        first: Bob
        last: Jones
        title: "Project Manager"
        department: PMO
        ou: "OU=Employees,OU=Users,DC=corp,DC=local"

      - username: cwilson
        first: Carol
        last: Wilson
        title: "DBA"
        department: "Database Administration"
        ou: "OU=Employees,OU=Users,DC=corp,DC=local"

      - username: dlee
        first: David
        last: Lee
        title: "Network Engineer"
        department: "Infrastructure"
        ou: "OU=Employees,OU=Users,DC=corp,DC=local"

  tasks:
    - name: Create each user account
      microsoft.ad.user:
        name: "{{ item.username }}"
        firstname: "{{ item.first }}"
        surname: "{{ item.last }}"
        display_name: "{{ item.first }} {{ item.last }}"
        upn: "{{ item.username }}@corp.local"
        email: "{{ item.username }}@corp.local"
        password: "{{ vault_initial_password }}"
        update_password: on_create
        path: "{{ item.ou }}"
        state: present
        enabled: true
        attributes:
          set:
            title: "{{ item.title }}"
            department: "{{ item.department }}"
      loop: "{{ new_employees }}"
      loop_control:
        label: "{{ item.username }}"
```

## Managing Active Directory Groups

The `microsoft.ad.group` module handles group lifecycle:

```yaml
# playbook-create-groups.yml
# Creates AD security groups for project teams
- name: Manage AD groups
  hosts: domain_controllers
  vars:
    project_groups:
      - name: GRP-Project-Alpha
        description: "Project Alpha team members"
        scope: global
        category: security

      - name: GRP-Project-Beta
        description: "Project Beta team members"
        scope: global
        category: security

      - name: DL-Engineering-All
        description: "All engineering staff distribution list"
        scope: global
        category: distribution

  tasks:
    - name: Create project groups
      microsoft.ad.group:
        name: "{{ item.name }}"
        description: "{{ item.description }}"
        scope: "{{ item.scope }}"
        category: "{{ item.category }}"
        path: "OU=Groups,DC=corp,DC=local"
        state: present
      loop: "{{ project_groups }}"
      loop_control:
        label: "{{ item.name }}"
```

Group scopes and their meanings:

| Scope | Can Contain | Can Be Used In |
|-------|------------|----------------|
| `domainlocal` | Users/groups from any domain | Same domain only |
| `global` | Users/groups from same domain | Any domain in forest |
| `universal` | Users/groups from any domain | Any domain in forest |

## Managing Group Membership

Adding and removing users from groups is one of the most common AD operations:

```yaml
# playbook-group-membership.yml
# Manages group membership for team assignments
- name: Manage group memberships
  hosts: domain_controllers
  tasks:
    - name: Add users to Project Alpha group
      microsoft.ad.group:
        name: GRP-Project-Alpha
        members:
          add:
            - asmith
            - bjones
            - cwilson
        state: present

    - name: Set exact membership for DBA group (removes unlisted members)
      microsoft.ad.group:
        name: GRP-Database-Admins
        members:
          set:
            - cwilson
            - dba-svc
        state: present

    - name: Remove a user from a group
      microsoft.ad.group:
        name: GRP-Project-Beta
        members:
          remove:
            - former-employee
        state: present
```

The difference between `add`, `set`, and `remove` is important:

- **add**: Adds the listed members while keeping existing ones
- **set**: Makes the membership exactly match the list (removes anyone not listed)
- **remove**: Removes only the listed members

## Creating Organizational Units

OUs provide the structure for organizing AD objects:

```yaml
# playbook-create-ous.yml
# Creates the organizational unit structure for a new department
- name: Create OU structure
  hosts: domain_controllers
  tasks:
    - name: Create top-level department OU
      microsoft.ad.ou:
        name: NewDepartment
        path: "DC=corp,DC=local"
        state: present
        description: "New Department organizational unit"
        protected: true

    - name: Create sub-OUs
      microsoft.ad.ou:
        name: "{{ item.name }}"
        path: "{{ item.path }}"
        state: present
        description: "{{ item.desc }}"
      loop:
        - name: Users
          path: "OU=NewDepartment,DC=corp,DC=local"
          desc: "Department user accounts"
        - name: Groups
          path: "OU=NewDepartment,DC=corp,DC=local"
          desc: "Department security groups"
        - name: Computers
          path: "OU=NewDepartment,DC=corp,DC=local"
          desc: "Department workstations"
        - name: ServiceAccounts
          path: "OU=NewDepartment,DC=corp,DC=local"
          desc: "Department service accounts"
      loop_control:
        label: "{{ item.name }}"
```

## Creating Service Accounts

Service accounts have different requirements than regular user accounts:

```yaml
# playbook-service-accounts.yml
# Creates service accounts with appropriate settings
- name: Create service accounts
  hosts: domain_controllers
  vars:
    service_accounts:
      - name: svc-webapp
        description: "Web application service account"
        password: "{{ vault_svc_webapp_pass }}"
      - name: svc-batch
        description: "Batch processing service account"
        password: "{{ vault_svc_batch_pass }}"
      - name: svc-monitoring
        description: "Monitoring agent service account"
        password: "{{ vault_svc_monitoring_pass }}"

  tasks:
    - name: Create service accounts
      microsoft.ad.user:
        name: "{{ item.name }}"
        description: "{{ item.description }}"
        password: "{{ item.password }}"
        update_password: on_create
        path: "OU=ServiceAccounts,DC=corp,DC=local"
        state: present
        enabled: true
        password_never_expires: true
        user_cannot_change_password: true
        attributes:
          set:
            servicePrincipalName:
              - "HTTP/{{ item.name }}.corp.local"
      loop: "{{ service_accounts }}"
      loop_control:
        label: "{{ item.name }}"
```

## Disabling and Removing Users

When employees leave or accounts need to be decommissioned:

```yaml
# playbook-offboard-user.yml
# Offboards a departing employee by disabling and moving their account
- name: Offboard employee
  hosts: domain_controllers
  vars:
    departing_user: jdoe
    disabled_ou: "OU=Disabled,OU=Users,DC=corp,DC=local"

  tasks:
    - name: Remove user from all groups except Domain Users
      ansible.windows.win_shell: |
        $user = Get-ADUser "{{ departing_user }}" -Properties MemberOf
        foreach ($group in $user.MemberOf) {
          $groupObj = Get-ADGroup $group
          if ($groupObj.Name -ne "Domain Users") {
            Remove-ADGroupMember -Identity $group -Members "{{ departing_user }}" -Confirm:$false
            Write-Output "Removed from: $($groupObj.Name)"
          }
        }
      register: group_removal

    - name: Display removed group memberships
      ansible.builtin.debug:
        msg: "{{ group_removal.stdout_lines }}"

    - name: Disable the user account
      microsoft.ad.user:
        name: "{{ departing_user }}"
        enabled: false
        description: "Disabled - Departed {{ ansible_date_time.date }}"
        state: present

    - name: Move user to Disabled OU
      microsoft.ad.user:
        name: "{{ departing_user }}"
        path: "{{ disabled_ou }}"
        state: present
```

## Querying AD for Information

Sometimes you need to gather information from AD before taking action:

```yaml
# playbook-ad-query.yml
# Queries Active Directory for user and group information
- name: Query AD information
  hosts: domain_controllers
  tasks:
    - name: Find all users in Engineering department
      ansible.windows.win_shell: |
        Get-ADUser -Filter { Department -eq "Engineering" } `
          -Properties DisplayName, Title, Department, Enabled |
          Select-Object SamAccountName, DisplayName, Title, Enabled |
          ConvertTo-Json -AsArray
      register: engineering_users

    - name: Display engineering team
      ansible.builtin.debug:
        msg: "{{ engineering_users.stdout | from_json }}"

    - name: Find accounts that have not logged in for 90 days
      ansible.windows.win_shell: |
        $cutoff = (Get-Date).AddDays(-90)
        Get-ADUser -Filter { LastLogonDate -lt $cutoff -and Enabled -eq $true } `
          -Properties LastLogonDate, DisplayName |
          Select-Object SamAccountName, DisplayName, LastLogonDate |
          ConvertTo-Json -AsArray
      register: stale_accounts

    - name: Display stale accounts
      ansible.builtin.debug:
        msg: "Found {{ (stale_accounts.stdout | from_json) | length }} accounts inactive for 90+ days"

    - name: Find locked out accounts
      ansible.windows.win_shell: |
        Search-ADAccount -LockedOut |
          Select-Object SamAccountName, LockedOut, LastLogonDate |
          ConvertTo-Json -AsArray
      register: locked_accounts
```

## Password Reset Automation

For helpdesk-type operations where you need to reset passwords:

```yaml
# playbook-reset-password.yml
# Resets a user's password and requires change at next logon
- name: Reset user password
  hosts: domain_controllers
  vars:
    target_user: "{{ reset_user }}"
    temp_password: "{{ vault_temp_password }}"

  tasks:
    - name: Reset password and force change at next logon
      microsoft.ad.user:
        name: "{{ target_user }}"
        password: "{{ temp_password }}"
        update_password: always
        password_expired: true
        state: present

    - name: Unlock account if locked
      ansible.windows.win_shell: |
        Unlock-ADAccount -Identity "{{ target_user }}"
        Write-Output "Account unlocked"
```

Run it with the target user as an extra variable:

```bash
# Reset password for a specific user
ansible-playbook playbook-reset-password.yml -e "reset_user=jdoe"
```

## Best Practices

**Use a dedicated service account for Ansible.** Do not use a personal admin account. Create a service account with the minimum permissions needed and document what it has access to.

**Always use Ansible Vault for passwords.** Every password in these playbooks should be encrypted. No exceptions.

**Use `update_password: on_create` for regular accounts.** This prevents Ansible from resetting passwords every time the playbook runs.

**Test in a lab domain first.** AD changes can have cascading effects. Test your playbooks in a non-production domain before running them against production.

**Log everything.** Use the Ansible callback plugin or AWX/Tower to keep audit logs of all AD changes made through automation.

**Prefer `add`/`remove` over `set` for group membership.** The `set` option is powerful but dangerous. If you forget to list a member, they get removed. Use `add` and `remove` unless you specifically want to enforce exact membership.

Active Directory management with Ansible scales from simple one-off tasks to enterprise-wide identity automation. Once you have your playbooks built, onboarding, offboarding, and access management become consistent, auditable, and fast.
