export interface CommitDiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface CommitDiffResult {
  sha: string;
  message: string;
  author: string;
  url: string;
  files: CommitDiffFile[];
}

export interface GitDiffError {
  sha: string;
  error: string;
}

const GITHUB_API = 'https://api.github.com';

function githubToken(): string {
  return process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN || '';
}

export async function fetchGitDiff(
  owner: string,
  repo: string,
  sha: string,
  maxPatchChars = 4000
): Promise<CommitDiffResult | GitDiffError> {
  const endpoint = `${GITHUB_API}/repos/${owner}/${repo}/commits/${sha}`;
  const token = githubToken();

  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return { sha, error: `GitHub API responded ${res.status} for ${owner}/${repo}@${sha}` };
    }

    interface GhFile {
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      patch?: string;
    }
    interface GhCommitResponse {
      sha: string;
      html_url: string;
      commit: { message: string; author?: { name?: string } };
      files?: GhFile[];
    }

    const json = (await res.json()) as GhCommitResponse;

    const files: CommitDiffFile[] = (json.files || []).slice(0, 8).map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: typeof f.patch === 'string' ? f.patch.slice(0, maxPatchChars) : undefined,
    }));

    return {
      sha: json.sha,
      message: json.commit?.message || '',
      author: json.commit?.author?.name || 'Unknown',
      url: json.html_url,
      files,
    };
  } catch (err) {
    return { sha, error: err instanceof Error ? err.message : 'Unknown error fetching commit diff' };
  }
}

export async function fetchRecentDiffs(
  owner: string,
  repo: string,
  shas: string[],
  maxCommits = 2
): Promise<Array<CommitDiffResult | GitDiffError>> {
  const results: Array<CommitDiffResult | GitDiffError> = [];
  for (const sha of shas.slice(0, maxCommits)) {
    results.push(await fetchGitDiff(owner, repo, sha));
  }
  return results;
}