SELECT Path, Sid, Permission
FROM `.sys/auth_permissions`
WHERE Sid IN ('reportuser'u, 'reportreaders'u)
ORDER BY Path, Sid, Permission;
