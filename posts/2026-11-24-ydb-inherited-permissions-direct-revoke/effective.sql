SELECT Path, Sid, Permission
FROM `.sys/auth_effective_permissions`
WHERE Sid IN ('reportuser'u, 'reportreaders'u)
ORDER BY Path, Sid, Permission;
