# Security Specification: Sky Chaos Airline Simulator

## 1. Data Invariants
1. **Pilot Profiles**: Each profile is stored at `/pilot_profiles/{userId}`. A pilot profile cannot be created, updated, or read by another user (`userId == request.auth.uid`). The `uid` in document data must strictly match `request.auth.uid`.
2. **Immutability of UID**: The `uid` field cannot be modified during updates (`incoming().uid == existing().uid`).
3. **Flight Debrief Reports**: Each debrief report is stored at `/flight_reports/{reportId}`. Only the authenticated owner can create reports with `userId == request.auth.uid`. Reports cannot be updated once filed (terminal/audit log).
4. **Denial of Wallet Protection**: String sizes must be bounded (`callsign <= 50`, `reportId <= 128`, `routeName <= 100`). Numbers cannot be negative where forbidden.
5. **No Blanket Reads**: All read and list rules evaluate `request.auth.uid` explicitly.

## 2. Dirty Dozen Payloads (Expected: PERMISSION_DENIED)
1. **Anonymous / Unauthenticated Read**: Unauthenticated request reading `/pilot_profiles/user123`.
2. **ID Spoofing on Profile Create**: User A attempting to create a profile under `/pilot_profiles/userB` or with `uid: "userB"`.
3. **Ghost Field Injection (Shadow Update)**: User attempting to write profile with unauthorized ghost field `isAdmin: true` or `cheaterMode: true`.
4. **UID Mutation on Profile Update**: User attempting to modify immutable `uid` property.
5. **Report Forgery**: User A creating a flight report under `userId: "userB"`.
6. **Report Mutation**: Attempting an `update` on an existing `/flight_reports/{reportId}` document.
7. **Report Deletion**: Attempting to delete another pilot's flight debrief record.
8. **Negative Cash Injection**: Writing `cash: -99999999` or non-number string `cash: "lots"`.
9. **Oversized Callsign String Attack**: Injecting a 50KB string into `callsign` to cause wallet exhaustion.
10. **Path Variable Poisoning**: Accessing document with invalid characters or oversized path variable.
11. **Blanket Query Scraping**: Attempting a collection list query across all pilots without `userId == request.auth.uid` filter.
12. **System Root Access**: Attempting read or write on unmapped collections `/{document=**}`.
