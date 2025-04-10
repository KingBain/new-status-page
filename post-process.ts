import fsExtra from 'fs-extra';
import { load } from 'js-yaml';
import { join } from 'path';

export const postProcess = async () => {
	// Log current working directory
	console.log('Current working directory:', process.cwd());

	// Load configuration from .upptimerc.yml (assumed to be in the parent directory)
	const config: {
		'status-website'?: {
			cname?: string;
			robotsText?: string;
			baseUrl?: string;
		};
	} = load(await fsExtra.readFile(join('..', '.upptimerc.yml'), 'utf8')) as any;
	const baseUrl = (config['status-website'] || {}).baseUrl || '/';

	// Set the output directory to "public"
	const publicDir = join('.', 'public');
	console.log('Using public directory:', publicDir);

	// Ensure the public directory exists
	await fsExtra.ensureDir(publicDir);
	console.log('Public folder ensured.');

	// If a custom baseUrl is specified, move files from that subfolder to the public root
	if (baseUrl !== '/') {
		const baseUrlDir = join(publicDir, baseUrl);
		if (await fsExtra.pathExists(baseUrlDir)) {
			console.log('Moving files from', baseUrlDir, 'to', publicDir);
			await fsExtra.copy(baseUrlDir, publicDir);
			await fsExtra.remove(baseUrlDir);
		}
	}

	// Copy the assets folder (if it exists) into the public directory
	try {
		const assetsDir = join('.', 'assets');
		if (await fsExtra.pathExists(assetsDir)) {
			console.log('Copying assets from', assetsDir, 'to', publicDir);
			await fsExtra.copy(assetsDir, publicDir, { recursive: true });
		}
	} catch (error) {
		console.log('Got an error in copying assets', error);
	}

	// Write the CNAME file if a custom domain is set.
	const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
	if (
		config['status-website'] &&
		config['status-website'].cname &&
		config['status-website'].cname !== 'demo.upptime.js.org'
	) {
		console.log('Writing CNAME:', config['status-website'].cname);
		await fsExtra.writeFile(join(publicDir, 'CNAME'), config['status-website'].cname);
	} else if (
		config['status-website'] &&
		config['status-website'].cname &&
		config['status-website'].cname === 'demo.upptime.js.org' &&
		owner === 'upptime' &&
		repo === 'upptime'
	) {
		console.log('Writing CNAME for demo.upptime.js.org');
		await fsExtra.writeFile(join(publicDir, 'CNAME'), 'demo.upptime.js.org');
	}

	// Write a robots.txt file if provided in the configuration
	if (config['status-website'] && config['status-website'].robotsText) {
		console.log('Writing robots.txt');
		await fsExtra.writeFile(join(publicDir, 'robots.txt'), config['status-website'].robotsText);
	}

	// Copy service-worker-index.html to create a 404.html file, if it exists
	const swIndex = join(publicDir, 'service-worker-index.html');
	if (await fsExtra.pathExists(swIndex)) {
		console.log('Copying service-worker-index.html to 404.html');
		await fsExtra.copyFile(swIndex, join(publicDir, '404.html'));
	}

	console.log('Post process completed successfully.');
};

postProcess();
