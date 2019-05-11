module.exports = {
	title: '小p的个人主页',
	description: 'Just playing around',
	themeConfig: {
		nav: [
			{ text: '主页', link: '/' },
			{
				text: '技术整理',
				items: [
					{ text: '业务相关', link: '/business/test' },
					{ text: '平台兼容性', link: '/plantform/' },
					{ text: '异常处理', link: '/error/' }
				]
			},
			{ text: '关于', link: '/about/' },
			{ text: 'Github', link: 'https://www.github.com/codeteenager' },
		],
		sidebar: {
			'/business/': [
				"test",
			],
			"/plantform/": [
				"ios1",
			],
			"/error/": [
				"web1",
			],
		},
		sidebarDepth: 3,
		lastUpdated: 'Last Updated',
	}
}