"use strict";

habitrpg.controller("GroupsCtrl", ['$scope', '$rootScope', 'Groups', '$http', 'API_URL', '$q', 'User', 'Members', '$state',
  function($scope, $rootScope, Groups, $http, API_URL, $q, User, Members, $state) {

      $scope.isMember = function(user, group){
        return ~(group.members.indexOf(user._id));
      }

      $scope.Members = Members;
      $scope._editing = {group:false};

      $scope.save = function(group){
        if(group._newLeader && group._newLeader._id) group.leader = group._newLeader._id;
        group.$save();
        group._editing = false;
      }

      $scope.addWebsite = function(group){
        group.websites.push(group._newWebsite);
        group._newWebsite = '';
      }

      $scope.removeWebsite = function(group, $index){
        group.websites.splice($index,1);
      }

      // ------ Loading ------

      $scope.groups = Groups.groups;
      $scope.fetchGuilds = Groups.fetchGuilds;
      $scope.fetchTavern = Groups.fetchTavern;

      // ------ Modals ------

      $scope.clickMember = function(uid, forceShow) {
        if (User.user._id == uid && !forceShow) {
          if ($state.is('tasks')) {
            $state.go('options');
          } else {
            $state.go('tasks');
          }
        } else {
          // We need the member information up top here, but then we pass it down to the modal controller
          // down below. Better way of handling this?
          Members.selectMember(uid);
          $rootScope.modals.member = true;
        }
      }

      $scope.removeMember = function(group, member, isMember){
        var yes = confirm("Do you really want to remove this member from the party?")
        if(yes){
          group.$removeMember({uuid: member._id});
          if(isMember){
            group.members = _.without(group.members, member);
          }else{
            group.invites = _.without(group.invites, member);
          }
        }
      }

    // ------ Invites ------

      $scope.invite = function(group){
        group.$invite({uuid:group.invitee}, function(){
          group.invitee = '';
        }, function(){
          group.invitee = '';
        });
      }
    }
  ])

  .controller("MemberModalCtrl", ['$scope', '$rootScope', 'Members',
    function($scope, $rootScope, Members) {
      $scope.timestamp = function(timestamp){
        return moment(timestamp).format('MM/DD/YYYY');
      }
      // We watch Members.selectedMember because it's asynchronously set, so would be a hassle to handle updates here
      $scope.$watch( function() { return Members.selectedMember; }, function (member) {
        $scope.profile = member;
      });
    }
  ])

  .controller('ChatCtrl', ['$scope', 'Groups', 'User', function($scope, Groups, User){
    $scope._chatMessage = '';

    $scope.postChat = function(group, message){
      if (_.isEmpty(message)) return
      $('.chat-btn').addClass('disabled');
      group.$postChat({message:message}, function(data){
        $scope._chatMessage = '';
        group.chat = data.chat;
        $('.chat-btn').removeClass('disabled');
      });
    }

    $scope.deleteChatMessage = function(group, message){
      if(message.uuid === User.user.id || (User.user.backer && User.user.backer.admin)){
        group.$deleteChatMessage({messageId: message.id}, function(){
          var i = _.indexOf(group.chat, message);
          if(i !== -1) group.chat.splice(i, 1);
        });
      }
    }

    $scope.sync = function(group){
      group.$get();
    }

    $scope.nameTagClasses = function(message){
      if (!message) return; // fixme what's triggering this?
      if (message.contributor) {
        if (message.contributor.match(/npc/i) || message.contributor.match(/royal/i)) {
          return 'label-royal';
        } else if (message.contributor.match(/champion/i)) {
          return 'label-champion';
        } else if (message.contributor.match(/elite/i)) {
          return 'label-success'; //elite
        }
      }
      if (message.uuid == User.user.id) {
        return 'label-inverse'; //self
      }
    }

  }])

  .controller("GuildsCtrl", ['$scope', 'Groups', 'User', '$rootScope', '$state', '$location',
    function($scope, Groups, User, $rootScope, $state, $location) {
      Groups.fetchGuilds();
      $scope.type = 'guild';
      $scope.text = 'Guild';
      $scope.newGroup = new Groups.Group({type:'guild', privacy:'private', leader: User.user._id, members: [User.user._id]});

      $scope.create = function(group){
        if (User.user.balance < 1) return $rootScope.modals.buyGems = true;

        if (confirm("Create Guild for 4 Gems?")) {
          group.$save(function(saved){
            $scope.groups.guilds.push(saved);
            if(saved.privacy === 'public') $scope.groups.public.push(saved);
            $state.go('options.social.guilds.detail', {gid: saved._id});
          });
        }
      }

      $scope.join = function(group){
        // If we're accepting an invitation, we don't have the actual group object, but a faux group object (for performance
        // purposes) {id, name}. Let's trick ngResource into thinking we have a group, so we can call the same $join
        // function (server calls .attachGroup(), which finds group by _id and handles this properly)
        if (group.id && !group._id) {
          group = new Groups.Group({_id:group.id});
        }

        group.$join(function(joined){
          var i = _.findIndex(User.user.invitations.guilds, {id:joined._id});
          if (~i) User.user.invitations.guilds.splice(i,1);
          $scope.groups.guilds.push(joined);
          $state.go('options.social.guilds.detail', {gid: joined._id});
        })
      }

      $scope.leave = function(group){
        if (confirm("Are you sure you want to leave this guild?") !== true) {
          return;
        }
        group.$leave(function(group){
          $scope.groups.guilds.splice(_.indexOf($scope.groups.guilds, group), 1);
          // remove user from group members if guild is public so that he can re-join it immediately
          if(group.privacy == 'public'){
            // slow when a lot of members...? probably yes
            group.members = _.without(group.members, function(member){
              member._id !== User.user._id;
            });
          }
          $state.go('options.social.guilds');
        });
      }

      $scope.reject = function(guild){
        var i = _.findIndex(User.user.invitations.guilds, {id:guild.id});
        if (~i){
          User.user.invitations.guilds.splice(i, 1);
          User.set('invitations.guilds', User.user.invitations.guilds);
        }
      }
    }
  ])

  .controller("PartyCtrl", ['$scope', 'Groups', 'User', '$state',
    function($scope, Groups, User, $state) {
      $scope.type = 'party';
      $scope.text = 'Party';
      $scope.group = Groups.groups.party;
      $scope.newGroup = new Groups.Group({type:'party', leader: User.user._id, members: [User.user._id]});
      $scope.create = function(group){
        group.$save(function(newGroup){
          $scope.group = newGroup;
        });
      }

      $scope.join = function(party){
        var group = new Groups.Group({_id: party.id, name: party.name});
        // there a better way to access GroupsCtrl.groups.party?
        group.$join(function(groupJoined){
          $scope.group = groupJoined;
        });
      }

      $scope.leave = function(group){
        if (confirm("Are you sure you want to leave this party?") !== true) {
          return;
        }
        group.$leave(function(){
          $scope.group = undefined;
        });
      }

      $scope.reject = function(){
        User.user.invitations.party = undefined;
        User.log({op:'set',data:{'invitations.party':{}}});
      }

      $scope.removeSelf = function(member){
        return member._id !== User.user._id;
      }
    }
  ])

  .controller("TavernCtrl", ['$scope', 'Groups', 'User',
    function($scope, Groups, User) {
      Groups.fetchTavern();
      $scope.group = Groups.groups.tavern;
      $scope.rest = function(){
        User.user.flags.rest = !User.user.flags.rest;
        User.log({op:'set',data:{'flags.rest':User.user.flags.rest}});
      }
    }
  ])