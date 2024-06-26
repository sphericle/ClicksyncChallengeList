import { round, score } from './score.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = '/data';

async function fetchBannedUsers() {
    try {
        const result = await fetch(`${dir}/_bannedUsers.json`);
        if (!result.ok) {
            const errorText = await result.text();
            throw new Error(`Failed to fetch _bannedUsers.json: ${result.status} ${result.statusText}. Response: ${errorText}`);
        }
        const responseText = await result.text();
        const bannedData = JSON.parse(responseText);
        const bannedUsers = (bannedData.bannedRecords || []).concat(bannedData.bannedCreators || []);
        
        console.log('Parsed banned users:', bannedUsers); // Log parsed banned users
        return bannedUsers;
    } catch (error) {
        console.error('Error fetching banned users:', error);
        return [];
    }
}

export async function fetchList() {
    try {
        const listResult = await fetch(`${dir}/_list.json`);
        if (!listResult.ok) {
            const errorText = await listResult.text();
            throw new Error(`Failed to fetch _list.json: ${listResult.status} ${listResult.statusText}. Response: ${errorText}`);
        }
        const list = await listResult.json();
        return await Promise.all(
            list.map(async (path, rank) => {
                try {
                    const levelResult = await fetch(`${dir}/${path}.json`);
                    if (!levelResult.ok) {
                        const errorText = await levelResult.text();
                        throw new Error(`Failed to fetch ${path}.json: ${levelResult.status} ${levelResult.statusText}. Response: ${errorText}`);
                    }
                    const level = await levelResult.json();

                    // Fetch banned users
                    const bannedUsers = await fetchBannedUsers();
                    if (bannedUsers.length !== 0) {
                        level.records = level.records.filter(
                            (record) => !bannedUsers.includes(record.user)
                        );
                    } 
                    // Remove records from banned users
                    

                    return [
                        {
                            ...level,
                            path,
                            records: level.records.sort((a, b) => b.percent - a.percent),
                        },
                        null,
                    ];
                } catch (error) {
                    console.error(`Failed to load level #${rank + 1} ${path}:`, error);
                    return [null, path];
                }
            })
        );
    } catch (error) {
        console.error('Failed to load list:', error);
        return null;
    }
}

export async function fetchEditors() {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        if (!editorsResults.ok) {
            const errorText = await editorsResults.text();
            throw new Error(`Failed to fetch _editors.json: ${editorsResults.status} ${editorsResults.statusText}. Response: ${errorText}`);
        }
        const editors = await editorsResults.json();
        return editors;
    } catch (error) {
        console.error('Error fetching editors:', error);
        return null;
    }
}

export async function fetchLeaderboard() {
    const bannedUsers = await fetchBannedUsers();
    const list = await fetchList();

    if (!list) {
        return [[], ['Failed to fetch level list']];
    }

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        // Remove records from banned users
        if (bannedUsers.length !== 0) {
        level.records = level.records.filter(
            (record) => !bannedUsers.includes(record.user)
        );
    }

        console.log(`Level: ${level.name}, Records after filtering:`, level.records); // Logging filtered records

        // Check if verifier is banned
        let verifier = Object.keys(scoreMap).find(
            (u) => u.toLowerCase() === level.verifier.toLowerCase(),
        ) || level.verifier;

        if (bannedUsers.includes(verifier)) {
            if (level.records.length > 0) {
                verifier = level.records[0].user;
            } else {
                return;
            }
        }

        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
        };
        const { verified } = scoreMap[verifier];
        verified.push({
            rank: rank + 1,
            level: level.name,
            score: score(rank + 1, 100, level.percentToQualify),
            link: level.verification,
        });

        // Records
        level.records.forEach((record) => {
            const user = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === record.user.toLowerCase(),
            ) || record.user;

            if (bannedUsers.includes(user)) return;

            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        });
    });

    // Wrap in extra Object containing the user and total score
    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    // Sort by total score
    return [res.sort((a, b) => b.total - a.total), errs];
}