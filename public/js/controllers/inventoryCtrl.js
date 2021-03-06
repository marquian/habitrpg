habitrpg.controller("InventoryCtrl", ['$scope', 'User',
  function($scope, User) {

    // convenience vars since these are accessed frequently
    $scope.userEggs = User.user.items.eggs;
    $scope.userHatchingPotions = User.user.items.hatchingPotions;

    $scope.selectedEgg = null; // {index: 1, name: "Tiger", value: 5}
    $scope.selectedPotion = null; // {index: 5, name: "Red", value: 3}

    $scope.chooseEgg = function(egg, $index){
      if ($scope.selectedEgg && $scope.selectedEgg.index == $index) {
        return $scope.selectedEgg = null; // clicked same egg, unselect
      }
      var eggData = _.defaults({index:$index}, egg);
      if (!$scope.selectedPotion) {
        $scope.selectedEgg = eggData;
      } else {
        $scope.hatch(eggData, $scope.selectedPotion);
      }
    }

    $scope.choosePotion = function(potion, $index){
      if ($scope.selectedPotion && $scope.selectedPotion.index == $index) {
        return $scope.selectedPotion = null; // clicked same egg, unselect
      }
      // we really didn't think through the way these things are stored and getting passed around...
      var potionData = _.findWhere(window.habitrpgShared.items.items.hatchingPotions, {name:potion});
      potionData = _.defaults({index:$index}, potionData);
      if (!$scope.selectedEgg) {
        $scope.selectedPotion = potionData;
      } else {
        $scope.hatch($scope.selectedEgg, potionData);
      }
    }

    $scope.sellInventory = function() {
      if ($scope.selectedEgg) {
        $scope.userEggs.splice($scope.selectedEgg.index, 1);
        User.setMultiple({
          'items.eggs': $scope.userEggs,
          'stats.gp': User.user.stats.gp + $scope.selectedEgg.value
        });
        $scope.selectedEgg = null;
      } else if ($scope.selectedPotion) {
        $scope.userHatchingPotions.splice($scope.selectedPotion.index, 1);
        User.setMultiple({
          'items.hatchingPotions': $scope.userHatchingPotions,
          'stats.gp': User.user.stats.gp + $scope.selectedPotion.value
        });
        $scope.selectedPotion = null;
      }
    }

    $scope.ownsPet = function(egg, potion){
      if (!egg || !potion) return;
      var pet = egg.name + '-' + potion;
      return User.user.items.pets && ~User.user.items.pets.indexOf(pet)
    }

    $scope.selectableInventory = function(egg, potion, $index) {
      if (!egg || !potion) return;
      // FIXME this isn't updating the view for some reason
      //if ($scope.selectedEgg && $scope.selectedEgg.index == $index) return 'selectableInventory';
      //if ($scope.selectedPotion && $scope.selectedPotion.index == $index) return 'selectableInventory';
      if (!$scope.ownsPet(egg, potion)) return 'selectableInventory';
    }

    $scope.hatch = function(egg, potion){
      if ($scope.ownsPet(egg, potion.name)){
        return alert("You already have that pet, hatch a different combo.")
      }
      var pet = egg.name + '-' + potion.name;
      $scope.userEggs.splice(egg.index, 1);
      $scope.userHatchingPotions.splice(potion.index, 1);

      if(!User.user.items.pets) User.user.items.pets = [];
      User.user.items.pets.push(pet);

      User.log([
        { op: 'set', data: {'items.pets': User.user.items.pets} },
        { op: 'set', data: {'items.eggs': $scope.userEggs} },
        { op: 'set', data: {'items.hatchingPotions': $scope.userHatchingPotions} }
      ]);

      alert("Your egg hatched! Visit your stable to equip your pet.");

      $scope.selectedEgg = null;
      $scope.selectedPotion = null;
    }

  }]);