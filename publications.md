---
layout: page
permalink: /publications/
title: Publications
class: pubs
---

{:.hidden}
# Publications

<div id="facets" class="hidden">
  <div class="facet" id="venue_tags">
    <strong>Venue</strong>
    <ul></ul>
  </div>
  <div class="facet" id="authors">
    <strong>Author</strong>
    <ul></ul>
  </div>
  <div class="facet" id="tags">
    <strong>Tag</strong>
    <ul></ul>
  </div>
  <div class="facet" id="type">
    <strong>Type</strong>
    <ul></ul>
  </div>
  <!--
  <div class="facet" id="awards">
    <strong>Award</strong>
    <ul></ul>
  </div>
  -->

</div>

<label id="only-highlight" class="hidden">
  <input type="checkbox" id="highlight">
  Show only highlights
</label>

<p id="clear-filters" class="hidden">
  <i class="fas fa-times-circle" aria-hidden="true"></i> Clear all filters. <span id="count_hidden">X</span> of <span id="count_total">X</span> publications are hidden by the filters.
</p>

<!-- <input id="ft-search" type="search" placeholder="Search papers..." /> -->

{% assign pubyears = site.data.publications | where_exp:"paper", "paper.hide == nil" | group_by:"year" %}
{% for year in pubyears %}
## {{ year.name }} 
{:#y{{ year.name }} .year}
{% for pub in year.items %}
  {% if pub.type != "In Progress" %}{% include publication.html pub=pub %}{% endif %}
{% endfor %}
{% endfor %}

<!-- <script src="https://cdn.jsdelivr.net/npm/itemsjs@1.0.40/dist/itemsjs.min.js"></script> -->
<script>
  {% include itemsjs.min.js %}
  {% include pubfilter.js %}
</script>
