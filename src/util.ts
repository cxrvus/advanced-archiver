import { TFile } from 'obsidian';
import Archiver from './main';

// the tag is hard-coded in order to work with the Canvas Mirror plugin
// idea: turn this into a setting & make canvas Mirror access that setting
export const MIRROR_TAG = '#mirror';


export const getDatePrefix = () => `${new Date().toISOString().split('T')[0].substring(2)} - `;
export const getFilePath = (folder: string, date: string, name: string) => `${folder}/${date}${name}`;



export const isOrphan = (self: Archiver, file: TFile): boolean => {
	const inlinks = getInlinks(self, file);
	const outlinks = getOutlinks(self, file);
	return !inlinks.length && !outlinks.length;
}

export const getInlinks = (self: Archiver, file: TFile): string[] => {
	const { resolvedLinks } = self.app.metadataCache;
	return Object.entries(resolvedLinks)
		.filter(([, targetFiles]) => targetFiles[file.path] > 0)
		.map(([sourcePath]) => sourcePath)
		.filter(path => preFilter(self, path));
}

export const getOutlinks = (self: Archiver, file: TFile): string[] => {
	const { resolvedLinks } = self.app.metadataCache;
	const outLinks = resolvedLinks[file.path] ? Object.keys(resolvedLinks[file.path]) : [];
	return outLinks.filter(path => preFilter(self, path));
}

export const preFilter = (self: Archiver, path: string): boolean => {
	const includedPaths = getPathsFromFolderList(self, self.settings.includedFolders);
	return !!includedPaths.find(includedPath => path.startsWith(includedPath));
}

export const getPathsFromFolderList = (self: Archiver, folderList: string) => {
	const paths = folderList.split(',').map(x => x.trim());
	paths.forEach(path => { if (!self.app.vault.getFolderByPath(path)) throw new Error(`invalid folder: ${path}`)});
	return paths;
}

export const postFilter = (self: Archiver, path: string): boolean => {
	if (self.settings.excludeMirrors) {
		const cache = self.app.metadataCache.getCache(path)?.tags;
		if (!cache) return true;
		else return !cache.map(tag => tag.tag).includes(MIRROR_TAG);
	}
	else return true;
}