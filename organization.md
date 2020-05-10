---
layout: page
permalink: /organization/
title: Organization
class: projects
---

{:.hidden}
# Organization

{:.lead}


<div class="grid">
  {% for project in site.data.organization %}
    {% include project.html project=project %}
  {% endfor %}
</div>
