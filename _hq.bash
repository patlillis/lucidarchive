#!/bin/bash
{
    SHA="$(git rev-parse --short head~5|tr -d '\n')"

    T=timestamp-$(date +%s)
    R=$(git stash save $t)

    git filter-branch -f --env-filter "GIT_AUTHOR_NAME='HQ'; GIT_AUTHOR_EMAIL='hq@lucidarchive.com'; GIT_COMMITTER_NAME='HQ'; GIT_COMMITTER_EMAIL='hq@lucidarchive.com';" $SHA..HEAD

    V=$(echo $R | grep $T)
    if [ "$V" ]; then
        git stash pop
    fi
}
