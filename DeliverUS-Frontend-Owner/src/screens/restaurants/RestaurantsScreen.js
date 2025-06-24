/* eslint-disable react/prop-types */
import React, { useContext, useEffect, useState } from 'react'
import { StyleSheet, FlatList, Pressable, View } from 'react-native'

import { getAll, remove, patchPinned } from '../../api/RestaurantEndpoints'
import ImageCard from '../../components/ImageCard'
import TextSemiBold from '../../components/TextSemibold'
import TextRegular from '../../components/TextRegular'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as GlobalStyles from '../../styles/GlobalStyles'
import { AuthorizationContext } from '../../context/AuthorizationContext'
import { showMessage } from 'react-native-flash-message'
import DeleteModal from '../../components/DeleteModal'
import restaurantLogo from '../../../assets/restaurantLogo.jpeg'
import { API_BASE_URL } from '@env'
import ConfirmationModal from '../../components/ConfirmationModal'

export default function RestaurantsScreen ({ navigation, route }) {
  const [restaurants, setRestaurants] = useState([])
  const [restaurantToBeDeleted, setRestaurantToBeDeleted] = useState(null)
  // Creamos un useState para la visualización del ConfirmationModal
  const [restaurantToBePinned, setRestaurantToBePinned] = useState(null)
  const { loggedInUser } = useContext(AuthorizationContext)

  useEffect(() => {
    if (loggedInUser) {
      fetchRestaurants()
    } else {
      setRestaurants(null)
    }
  }, [loggedInUser, route])

  const renderRestaurant = ({ item }) => {
    return (
      <ImageCard
        imageUri={item.logo ? { uri: API_BASE_URL + '/' + item.logo } : restaurantLogo}
        title={item.name}
        onPress={() => {
          navigation.navigate('RestaurantDetailScreen', { id: item.id })
        }}
      >
        <TextRegular numberOfLines={2}>{item.description}</TextRegular>
        {item.averageServiceMinutes !== null &&
          <TextSemiBold>Avg. service time: <TextSemiBold textStyle={{ color: GlobalStyles.brandPrimary }}>{item.averageServiceMinutes} min.</TextSemiBold></TextSemiBold>
        }
        <View style={{ marginBottom: 20, flexDirection: 'row' }}>
        <TextSemiBold>Shipping: <TextSemiBold textStyle={{ color: GlobalStyles.brandPrimary }}>{item.shippingCosts.toFixed(2)}€</TextSemiBold></TextSemiBold>
        {/* Aquí introducimos el elemento de pineado */}
        <Pressable
            onPress={() => setRestaurantToBePinned(item)} // Al pasarle item de esta forma deja de ser distinto de null y se muestra el modal
            style={({ pressed }) => [
              {
                backgroundColor: pressed
                  ? GlobalStyles.brandBlueTap
                  : 'white'
              },
              styles.buttonPinned
              // styles.actionButton Vamos a quitarlo por ahora
            ]}
        >
          <MaterialCommunityIcons
              name={item.pinnedAt ? 'pin' : 'pin-outline'}
              color={GlobalStyles.brandSecondaryTap}
              size={24}
          />
        </Pressable>
        </View>
        <View style={styles.actionButtonsContainer}>
          <Pressable
            onPress={() => navigation.navigate('EditRestaurantScreen', { id: item.id })
            }
            style={({ pressed }) => [
              {
                backgroundColor: pressed
                  ? GlobalStyles.brandBlueTap
                  : GlobalStyles.brandBlue
              },
              styles.actionButton
            ]}>
          <View style={[{ flex: 1, flexDirection: 'row', justifyContent: 'center' }]}>
            <MaterialCommunityIcons name='pencil' color={'white'} size={20}/>
            <TextRegular textStyle={styles.text}>
              Edit
            </TextRegular>
          </View>
        </Pressable>

        <Pressable
            onPress={() => { setRestaurantToBeDeleted(item) }}
            style={({ pressed }) => [
              {
                backgroundColor: pressed
                  ? GlobalStyles.brandPrimaryTap
                  : GlobalStyles.brandPrimary
              },
              styles.actionButton
            ]}>
          <View style={[{ flex: 1, flexDirection: 'row', justifyContent: 'center' }]}>
            <MaterialCommunityIcons name='delete' color={'white'} size={20}/>
            <TextRegular textStyle={styles.text}>
              Delete
            </TextRegular>
          </View>
        </Pressable>
        </View>
      </ImageCard>
    )
  }

  const renderEmptyRestaurantsList = () => {
    return (
      <TextRegular textStyle={styles.emptyList}>
        No restaurants were retreived. Are you logged in?
      </TextRegular>
    )
  }

  const renderHeader = () => {
    return (
      <>
      {loggedInUser &&
      <Pressable
        onPress={() => navigation.navigate('CreateRestaurantScreen')
        }
        style={({ pressed }) => [
          {
            backgroundColor: pressed
              ? GlobalStyles.brandGreenTap
              : GlobalStyles.brandGreen
          },
          styles.button
        ]}>
        <View style={[{ flex: 1, flexDirection: 'row', justifyContent: 'center' }]}>
          <MaterialCommunityIcons name='plus-circle' color={'white'} size={20}/>
          <TextRegular textStyle={styles.text}>
            Create restaurant
          </TextRegular>
        </View>
      </Pressable>
    }
    </>
    )
  }
  const fetchRestaurants = async () => {
    try {
      const fetchedRestaurants = await getAll()
      //  Ordenar por fecha de pineado (de más antigua a más reciente) ---> Cada vez que se entra en esta pantalla aparecerán ordenados
      const sortedRestaurants = fetchedRestaurants.sort((a, b) => {
        if (a.pinnedAt && b.pinnedAt) { // Solo si los dos están pineados se pueden ordenar
          return new Date(a.pinnedAt) - new Date(b.pinnedAt)
        } else if (a.pinnedAt) {
          return -1
        } else if (b.pinnedAt) {
          return 1
        } else {
          return 0
        }
      })
      setRestaurants(sortedRestaurants)
    } catch (error) {
      showMessage({
        message: `There was an error while retrieving restaurants. ${error} `,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const removeRestaurant = async (restaurant) => {
    try {
      await remove(restaurant.id)
      await fetchRestaurants()
      setRestaurantToBeDeleted(null)
      showMessage({
        message: `Restaurant ${restaurant.name} succesfully removed`,
        type: 'success',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    } catch (error) {
      console.log(error)
      setRestaurantToBeDeleted(null)
      showMessage({
        message: `Restaurant ${restaurant.name} could not be removed.`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }
  const pinnedRestaurant = async (item) => {
    try {
      const restaurantPinned = await patchPinned(item.id)
      // Actualizamos la lista de restaurantes para poder hacer un renderizado
      const restaurantsUpdated = restaurants.map(
        r => r.id === restaurantPinned.id ? restaurantPinned : r
      )
      // Los ordenamos
      const sortedRestaurants = restaurantsUpdated.sort((a, b) => {
        if (a.pinnedAt && b.pinnedAt) { // Solo si los dos están pineados se pueden ordenar
          return new Date(a.pinnedAt) - new Date(b.pinnedAt)
        } else if (a.pinnedAt) {
          return -1
        } else if (b.pinnedAt) {
          return 1
        } else {
          return 0
        }
      })
      setRestaurantToBePinned(null)
      setRestaurants(sortedRestaurants)
    } catch (error) {
      console.log(error)
      setRestaurantToBePinned(null)
      showMessage({
        message: `Restaurant ${item.name} could not be pinned.`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }
  return (
    <>
    <FlatList
      style={styles.container}
      data={restaurants}
      renderItem={renderRestaurant}
      keyExtractor={item => item.id.toString()}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyRestaurantsList}
    />
    <DeleteModal
      isVisible={restaurantToBeDeleted !== null}
      onCancel={() => setRestaurantToBeDeleted(null)}
      onConfirm={() => removeRestaurant(restaurantToBeDeleted)}>
        <TextRegular>The products of this restaurant will be deleted as well</TextRegular>
        <TextRegular>If the restaurant has orders, it cannot be deleted.</TextRegular>
    </DeleteModal>
    <ConfirmationModal
      isVisible={restaurantToBePinned !== null}
      onCancel={() => setRestaurantToBePinned(null)} // Deja de hacerlo visible
      onConfirm={() => pinnedRestaurant(restaurantToBePinned)} // Si se confirma llamamos a la función que pinea el restaurante (es como un update, un patch más bien)
    />
      {/* Aparentemente no hace falta ponerle texto como children, solo los dos botones y el título */}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  button: {
    borderRadius: 8,
    height: 40,
    marginTop: 12,
    padding: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    width: '80%'
  },
  actionButton: {
    borderRadius: 8,
    height: 40,
    marginTop: 12,
    margin: '1%',
    padding: 10,
    alignSelf: 'center',
    flexDirection: 'column',
    width: '50%'
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    bottom: 5,
    position: 'absolute',
    width: '90%'
  },
  text: {
    fontSize: 16,
    color: 'white',
    alignSelf: 'center',
    marginLeft: 5
  },
  emptyList: {
    textAlign: 'center',
    padding: 50
  },
  buttonPinned: {
    marginLeft: 'auto'
  }
})
