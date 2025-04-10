<script>
	import Loading from '$lib/components/Loading.svelte';
	import { onMount } from 'svelte';
	import config from '$lib/data/config.json';
	import { cachedResponse, createOctokit, handleError } from '$lib/utils/createOctokit';

	export let slug;
	let loading = true;
	const octokit = createOctokit();
	const owner = config.owner;
	const repo = config.repo;
	let incidents = [];

	onMount(async () => {
		try {
			incidents = (
				await cachedResponse(`closed-issues-${owner}-${repo}-${slug}`, () =>
					octokit.issues.listForRepo({
						owner,
						repo,
						state: 'closed',
						filter: 'all',
						sort: 'created',
						direction: 'desc',
						labels: `status,${slug}`
					})
				)
			).data;
		} catch (error) {
			handleError(error);
		}
		incidents = incidents.map((incident, index) => {
			incident.showHeading =
				index === 0 ||
				new Date(incidents[index - 1].created_at).toLocaleDateString() !==
					new Date(incident.created_at).toLocaleDateString();
			return incident;
		});
		loading = false;
	});
</script>

<section>
	{#if loading}
		<Loading />
	{:else if incidents.length}
		<h2>{config.i18n.pastIncidents}</h2>
		{#each incidents as incident}
			{#if incident.showHeading}
				<h3>{new Date(incident.created_at).toLocaleDateString(config.i18n.locale)}</h3>
			{/if}
			<article class="down link {incident.title.includes('degraded') ? 'degraded' : ''}">
				<div class="f">
					<div>
						<h4>{incident.title.replace('🛑', '').replace('⚠️', '').trim()}</h4>
						<div>
							{@html config.i18n.pastIncidentsResolved
								.replace(
									/\$MINUTES/g,
									(
										(new Date(incident.closed_at).getTime() -
											new Date(incident.created_at).getTime()) /
										60000
									).toFixed(0)
								)
								.replace(/\$POSTS/g, incident.comments)}
						</div>
					</div>
					<div class="f r">
						<a href={`${config.path}/incident/${incident.number}`}>
							{config.i18n.incidentReport.replace(/\$NUMBER/g, incident.number)}
						</a>
					</div>
				</div>
			</article>
		{/each}
	{/if}
</section>

<style>
	h2 {
		margin-top: 2rem;
	}
</style>
