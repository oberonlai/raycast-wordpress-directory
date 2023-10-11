import { useState } from "react";
import { useAI, useFetch } from "@raycast/utils";
import { ActionPanel, Action, List, Icon, environment, AI, Detail } from "@raycast/api";

const rootUrl = "https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[per_page]=100";

interface SearchResult {
  name: string;
  description: string;
  type: string;
  url: string;
  icon: string;
  download: string;
  version: string;
  rating: string;
  solved: string;
  downloaded: string;
  update: string;
  active: string;
  slug: string;
  author: string;
}

interface Plugin {
  map: any;
  length: number;
  name: string;
  description: string;
  short_description: string;
  slug: string;
  version: string;
  icons: {
    "1x": string;
  };
  ratings: {
    "1": number;
  };
  download_link: string;
  num_ratings: number;
  support_threads_resolved: number;
  support_threads: number;
  active_installs: number;
  downloaded: number;
  last_updated: string;
  author: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const url = searchText.length > 0 ? `${rootUrl}&request[search]=${searchText}` : `${rootUrl}&request[browse]=new`;

  const { data, isLoading } = useFetch<Plugin>(url, {
    parseResponse: async (response: Response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const responseData = await response.json();
      const plugins = responseData.plugins || [];
      const parsedData = plugins.map(
        (plugin: Plugin) =>
          ({
            name: plugin.name.replace(/&#8211;/g, "-"),
            slug: plugin.slug,
            description:
              plugin.description?.replace(/<[^>]+>/g, "\n") || plugin.short_description?.replace(/<[^>]+>/g, "\n"),
            url: `https://wordpress.org/plugins/${plugin.slug}/`,
            icon: plugin?.icons["1x"] || "../assets/icon-s.png",
            download: plugin.download_link,
            version: plugin.version,
            rating: plugin.ratings["1"] + " / " + plugin.num_ratings,
            solved: plugin.support_threads_resolved + " / " + plugin.support_threads,
            downloaded: plugin.active_installs.toLocaleString() + " / " + plugin.downloaded.toLocaleString(),
            update: plugin.last_updated,
			author:plugin.author.replace(/<[^>]+>/g, ''),
          } as SearchResult)
      );
      return parsedData;
    },
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search WordPress plugins..."
      isShowingDetail
      throttle
    >
      <List.Section title={searchText.length > 0 ? "Results" : "Latest"} subtitle={data?.length + ""}>
        {data?.map((searchResult: SearchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
	let devpendencyWoo = (searchResult?.name?.toLowerCase()?.includes('woocommerce')) ? 'plugin=woocommerce&':'';
  return (
    <List.Item
      title={searchResult?.name}
      icon={searchResult?.icon}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <DefaultActions searchResult={searchResult} />
				<Action.OpenInBrowser title={"Download version " + searchResult?.version} url={searchResult?.download || "#"} />
				<Action.OpenInBrowser title="Install on TasteWP" url={`https://tastewp.com/new/?pre-installed-plugin-slug=${searchResult?.slug}&pre-installed-plugin-slug=woocommerce/`} />
				<Action.OpenInBrowser title="Install on WP Playground" url={`https://playground.wordpress.net/?${devpendencyWoo}&plugin=${searchResult.slug}&login=1&url=/wp-admin//`} />
            {environment.canAccess(AI) && (
              <Action.Push
                title="Translate Plugin Description in Tradtional Chinese"
                icon={Icon.Paragraph}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                target={<Summary searchResult={searchResult} />}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={searchResult?.description}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Last Updated" text={searchResult?.update || "loading..."} />
              <List.Item.Detail.Metadata.Label title="Author" text={searchResult?.author || "loading..."} />
              <List.Item.Detail.Metadata.Label
                title="Active Installs / Downloaded"
                text={searchResult?.downloaded || "loading..."}
              />
              <List.Item.Detail.Metadata.Label
                title="1 Star / Total Stars"
                text={searchResult?.rating || "loading..."}
              />
              <List.Item.Detail.Metadata.Label
                title="Solved Issues / Total Issues"
                text={searchResult?.solved || "loading..."}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function DefaultActions({ searchResult }: { searchResult: SearchResult }) {
  return (
    <>
      <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
      <Action.CopyToClipboard title="Copy URL to Clipboard" content={searchResult.url} />
    </>
  );
}

function Summary({ searchResult }: { searchResult: SearchResult }) {
  const item = JSON.stringify(searchResult.description.substring(0, 2000));
  const prompt = `Translate the following from the WordPress plugin description in Tradtional Chinese. The context can only be about WordPress. Format the response as if you are providing documentation:\n${item.replace(
    "\n",
    ""
  )}`;
  const { data, isLoading } = useAI(prompt, { creativity: 0 });
  const code = data.match(/```[\w\S]*\n([\s\S]*?)\n```/);

  return (
    <Detail
      navigationTitle="AI Translate Description"
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Continue in Chat"
              icon={Icon.SpeechBubble}
              url={`raycast://extensions/raycast/raycast-ai/ai-chat?fallbackText=${encodeURIComponent(prompt)}`}
            />
            <DefaultActions searchResult={searchResult} />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              title="Copy Translation To Clipboard"
              content={data}
            />
            {code?.[1] ? (
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                title="Copy Snippet To Clipboard"
                content={code[1].replace(/`{3}/g, "")}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
