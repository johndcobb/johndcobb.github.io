---
layout: page
permalink: /talks/
title: Talks
class: talks
---

{:.hidden}
# Talks

{% assign talktitles = site.data.talks | group_by:"title" %}
{% for title in talktitles %}{% if title.items[0].hide == nil %}
{:.talk-title}
### {{ title.name }}
{% assign sorted_talks = title.items | sort: 'date' | reverse %}
{% for talk in sorted_talks  %}
  {% include talk.html talk=talk %}
{% endfor %}
{% endif %}{% endfor %}
